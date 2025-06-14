---
title: "Whispers In The Background"
date: 2023-05-01
description: "Implementing an Event-Driven approach for whisper transcriptions"
categories:
  - LLMs
  - Whisper
authors:
  - ivanleomk
---

## Introduction

![](https://user-images.githubusercontent.com/45760326/235455711-4dd33dde-88f9-456f-b5b5-c1c26e638576.png)
I recently ran into two problems when trying to generate transcript for audio files using whisper when working with NextJS

1. They were taking too long and the request would time out
2. The files were too large and I couldn't send them through the request body of a api route

If you're not familiar with NextJS deployed on Vercel, there are two limits that they place on your functions - they have to finish executing in at most 30s and the request body can't be larger than 4.5MB. You can try overriding body parser to take maybe 8mb of data but that's not a good idea since large audio files are often significantly larger than that.

I decided to try and solve this problem by using a long-running docker container which would act as a server and would be able to handle large files. I also decided to use a queue to handle the requests so that I could handle multiple requests at once.

### Database-as-a-Queue

<b>Here's the kicker - my database is my queue.</b>

I was inspired by [this article](https://www.prequel.co/blog/sql-maxis-why-we-ditched-rabbitmq-and-replaced-it-with-a-postgres-queue) I had read a while ago about how they had replaced RabbitMQ with Postgres and thought I'd be able to give it a shot too.

I came up with the following schema for a table which would be able to serve as our queue.

![](https://user-images.githubusercontent.com/45760326/235456606-13ec3fb4-43da-4a10-ba62-89b275464b17.png)

Let's walk through a few important columnns.

> Note, I'm using ID because planetscale prevents the use of strings as primary
> keys

1. `isProcesing` : This variable helps tell us when we started processing an item and how long it has been stuck processing an item for.
2. `isProcessed` : This variable tells us if the item has been processed or not.
3. `isTranscribed` : This variable tells us whether an item has been processed or not.
4. `startedProcessing`: This is a timestamp which tells us exactly when we started processing the current file.

So how do these variables help to ensure we have a queue?

1. When a docker instance picks a item from the list to process, it sets `isProcessing` to true and sets the `processingStartedAt` to the current time. If another docker container happens to pick it up at the same time, it will see `isProcessing` has been set to true and abandon the job.

2. If it accidentally crashes or is unable to finish the processing, we have the `startedProcessing` variable to tell us when exactly processing started. We can then specify a threshold, after which another docker instance can pick up the job even if `isProcessing` is set to true.

3. if the file has already been transcribed, we can just end the job early.

We can visualise this using a flowchart as seen below

![](https://user-images.githubusercontent.com/45760326/235459095-efba6b62-27c9-460c-abfc-09c154a4a4bf.png)

Each of these jobs will always be completed by adding a cron job down the line which takes all the outstanding files which have been processing for more than a certain amount of time and sends them to be processed.

We can express this in psuedocode as follows

```python
# Get All Files that have isProcessing=false OR (isProcessing=True and startedProcessingAt > 30 minutes ago)
```

I might also add a retry counter which will help track the number of times a file has been attempted to be processed and if it has failed too many times, we can just mark it as failed and move on. Errors can then be shown to the user who might have uploaded a corrupted file.

### Fault Tolerance

I built this to tolerate two main kinds of faults

1. Docker Containers going down - If a file is being processed midway and our docker container dies, a cron job will identify all the files that need to be processed easily and retry them

2. File Information being captured - we capture a succesful upload at two different locations. The first is on the user's side after they get notified that they have a succesful upload. The second is on that of AWS S3. By adding in a trigger to automatically start processing the file upon uploading it to S3, we can ensure that we have a backup of the file in case something goes wrong.

That's a quick writeup on what I found most interesting about this specific project. I'll be writing a more detailed post about how I built this and certain parts in the future so stay tuned!
