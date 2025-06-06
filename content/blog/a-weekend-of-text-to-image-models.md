---
title: "A Weekend of Text to Image/Video Models"
date: 2024-12-22
description: Practical guide to setting up text-to-image and video generation using Modal and ComfyUI
categories:
  - Modal
  - Diffusion Models
  - ComfyUI
authors:
  - ivanleomk
---

# A Weekend of Text to Image/Video Models

> You can find the code for this post [here](https://github.com/ivanleomk/comfy-experiments).

I had a lot of fun playing around with text to image models over the weekend and thought I'd write a short blog post about some of the things I learnt. I ran all of this on Modal and spent ~10 USD across the entire weekend which is honestly well below the Modal $20 free tier credit.

This was mainly for a small project i've been working on called CYOA where users get to create their own stories and have a language model automatically generate images and choices for each of them.

## Model Capabilities and Examples

I played around with 3 different models over the weekend - flux, ltx-video and mochi. At the end, I think I'll end up going with flux for the final version of CYOA's graphics since it produces the most consistently good results. I've found LTX-Video and Mochi to be a bit inconsistent ( it is after all much harder to get good results with video generations ).

To demonstrate these capabilities, here's an example using LTX-Video with a detailed prompt:

```
Close-up portrait of an 80-year-old fisherman, shot on Sony α7 III, 85mm f/1.2 lens,
dramatic side lighting, deep wrinkles telling stories of ocean adventures, weathered
skin with salt-and-pepper beard, piercing blue eyes looking off-frame, wearing a
faded denim work jacket, soft blurred background of misty coastline
```

![LTX Video](./images/ComfyUI_00004_-2.webp)

I generally find that prompt quality has a huge bearing on output. Most scenes require multiple iterations of prompt refinement to achieve the result that you want. Ultimately, I think this will be a manual process for the user to do and iterate until you get something that you want.

## Why ComfyUI?

I think you should use ComfyUI over rolling your own complex workflow code at the start for 3 main reasons.

1. It's quick to get started
2. It's easy to download a workflow that someone has created and use that as a starting point
3. Many models come out of the box with `ComfyUI` support that you don't need to implement youself - that's a huge time saver. In fact LTX only can be used with ComfyUI or their own bespoke repository code.

This means that while you can definitely do the following to generate images with flux and get a slight performance improvement, ComfyUI is a much better starting point, especially if you're a beginner to prompting text to image/video models like I am. Personally I struggled to get many of these models working nicely, and at the start, couldn't find a way to get around Flux's 75 token limit until ComfyUI made it easy to hook in the `t5` encoder to swop out the `clip` encoder.

```python
pipe = FluxPipeline.from_pretrained(
    f"black-forest-labs/FLUX.1-{VARIANT}",
    torch_dtype=torch.bfloat16
)
pipe.to("cuda")
results = pipe(
    prompts,
    output_type="pil",
    num_inference_steps=NUM_INFERENCE_STEPS,
    width=800,
    height=400,
)
```

More importantly, by using ComfyUI we can easily put together complex workflows and visually debug the results. Changing the prompt or model itself is as easy as clicking a button - which is a huge time saved when tinkering between say flux-dev and flux-schnell for example to see which makes the most sense for your use case.

These workflows are a bit clunky in `.json` as you'll see below so I highly recommend using the UI to create them by exporting them.

```json
{
  "5": {
    "inputs": {
      "width": 1024,
      "height": 1024,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage"
  }
}
```

## Setting Up with Modal

The implementation consists of three main components working together. First, we need efficient model weight management for downloading and storing the models. Then, we'll create a development UI for interactive experimentation. Finally, we'll set up a production endpoint for scalable deployment.

### Model Weight Management

We start by creating a Modal Image with the necessary dependencies. This setup enables parallel downloading and efficient storage of model weights:

```python
import modal

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("huggingface_hub[hf_transfer]==0.26.2")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_commands("rm -rf /root/comfy/ComfyUI/models")
)

app = modal.App(name="comfyui-models", image=image)
vol = modal.Volume.from_name("comfyui-models", create_if_missing=True)
```

To handle the downloads efficiently, we implement a parallel download function:

```python
@app.function(
    volumes={"/root/models": vol},
    secrets=[modal.Secret.from_name("my-huggingface-secret")],
)
def hf_download(repo_id: str, filename: str, model_type: str):
    from huggingface_hub import hf_hub_download
    print(f"Downloading {filename} from {repo_id} to {model_type}")
    hf_hub_download(
        repo_id=repo_id,
        filename=filename,
        local_dir=f"/root/models/{model_type}",
    )
```

We can then use this function to download the models we need.

```python
@app.local_entrypoint()
def download_models():
    models_to_download = [
        # format is (huggingface repo_id, the model filename, comfyui models subdirectory we want to save the model in)
        (
            "black-forest-labs/FLUX.1-schnell",
            "ae.safetensors",
            "vae",
        ),
        (
            "black-forest-labs/FLUX.1-schnell",
            "flux1-schnell.safetensors",
            "unet",
        ),
        ...// define more models here
    ]
    list(hf_download.starmap(models_to_download))

```

### Development UI

For the development phase, we create an interactive ComfyUI instance. This interface allows us to experiment with different models and parameters in real-time:

```python
@app.function(
    allow_concurrent_inputs=10,
    concurrency_limit=1,
    container_idle_timeout=30,
    timeout=1800,
    gpu="A100",
    volumes={"/root/comfy/ComfyUI/models": vol},
)
@modal.web_server(8000, startup_timeout=60)
def ui():
    subprocess.Popen(
        "comfy launch -- --listen 0.0.0.0 --port 8000",
        shell=True
    )
```

Access the development interface by running `modal serve ui.py`. This provides an interactive environment for testing and refining your generation pipelines.

### Production Endpoint

For production deployment, we create a robust API endpoint that can handle multiple requests efficiently:

```python
@app.cls(
    gpu="A100",
    mounts=[
        modal.Mount.from_local_file(
            Path(__file__).parent / "flux.json",
            "/root/flux.json",
        )
    ],
    volumes={"/root/comfy/ComfyUI/models": vol},
)
class ComfyUI:
    @modal.enter()
    def launch_comfy_background(self):
        cmd = "comfy launch --background"
        subprocess.run(cmd, shell=True, check=True)

    @modal.web_endpoint(method="POST")
    def api(self, item: Dict):
        from fastapi import Response

        workflow_data = json.loads(
            (Path(__file__).parent / "flux.json").read_text()
        )
        workflow_data["6"]["inputs"]["text"] = item["prompt"]
        client_id = uuid.uuid4().hex
        workflow_data["9"]["inputs"]["filename_prefix"] = client_id

        new_workflow_file = f"{client_id}.json"
        json.dump(workflow_data, Path(new_workflow_file).open("w"))
        img_bytes = self.infer.local(new_workflow_file)

        return Response(img_bytes, media_type="image/jpeg")
```

The performance characteristics reveal the system's efficiency. Cold starts take approximately 90 seconds as the model loads into memory. Once warm, requests complete in 5-10 seconds. The system scales horizontally when multiple A100s are available, making it suitable for production workloads.

## Improving Output Quality

### Prompt Engineering with LLMs

Through experimentation, I found that using language models to generate scene descriptions dramatically improves output quality. These LLM-generated prompts incorporate camera specifications, lighting details, visual references, and scene elements in a coherent way.

```markdown
Generate a scene description (~100 words) including:

- Reference shots from specific films
- Detailed scene elements and composition
- Technical camera details

Here are some good examples

- The waves crash against the jagged rocks of the shoreline, sending spray high into the air.The rocks are a dark gray color, with sharp edges and deep crevices. The water is a clear blue-green, with white foam where the waves break against the rocks. The sky is a light gray, with a few white clouds dotting the horizon.

<story>

</story>
```

The resulting prompts provide rich detail for the image generation models to work with, leading to more consistent and higher quality outputs.

### Video Output Processing

Working with video outputs requires careful handling of formats and conversions. I developed this utility function to manage the process:

```python
import requests
from PIL import Image

def generate_and_convert_video(modal_url, prompt):
    # API request
    response = requests.post(modal_url, json={"prompt": prompt})

    if response.status_code == 200:
        # Save WebP
        with open("output.webp", "wb") as f:
            f.write(response.content)

        # Convert to GIF
        im = Image.open("output.webp")
        frames = []
        try:
            while True:
                frames.append(im.copy())
                im.seek(len(frames))
        except EOFError:
            pass

        if frames:
            frames[0].save(
                "output.gif",
                format="GIF",
                append_images=frames[1:],
                save_all=True,
                duration=im.info.get("duration", 100),
                loop=1
            )
```

This utility handles the complete pipeline from generation request to final GIF output, making it simple to integrate video generation into larger applications.

## Conclusion

Modal and ComfyUi makes it easy to get started with complex stable diffusion-esque workflows. Instead of worrying about the infrastructure or spending hours making sure your workflows are working nicely, you can just click and try different models and workflows without much difficulty. Deploying/scaling it is also a breeze.

When you get to a specific scale, then maybe worry about the pipeline and the performance differential that using ComfyUi might cost you. But until then, I think it's probably the dominant way that I'll be using these models from now on.
