# AWS SMS Blast

Send batch SMS from the command line, powered by [AWS SNS text messaging](https://docs.aws.amazon.com/sns/latest/dg/sms_publish-to-phone.html).


* Forgiving phone number parsing with landline rejection.
* Variable interpolation in messages ({firstName})
* AWS cost estimation
* Fully multithreaded message sending 

## Installation

Just clone the repo.

## Usage

### Setup
  * Create and configure `.env.json` with your Mailgun API key (Copy `.example.env.json` and customize)
  * Create a `data` directory in project root

### On every run:
1. In `./data`, add:
  * A CSV file `phones.csv` containing the a column `phone`
  * Text file: `message.txt` 
2. `npm run send`


### Message

Your message is subject to the limits of SMS messages.
Message length must be under 140 bytes. This is 140 ASCII characters.

Longer messages will be split by SNS into separate messages, each of which will be billed individually.

See the [official SNS docs](https://docs.aws.amazon.com/sns/latest/dg/sms_publish-to-phone.html).



### Appendix

#### Why multithreading?

SNS text messaging does not support bulk sending. This means that a separate API call must be made for every message. So 1000 recipients = 1000 API calls.

Additionally, SNS imposes a 100 requests/second limit.

We solve this by spawning worker threads that send the messages in parallel. A worker pool prevents too many messages from being sent at once.

> A potential workaround was to generate a throwaway SNS Topic, subscribe all the phone numbers to the topic, and then send a single message to the topic, which SNS would deliver to all phone numbers. Unfortunately SNS subscriptions do not support bulk signup either, so we'd need to make the same amount of API calls. 

#### Applying for SNS bulk limits

All AWS accounts are limited by up to $1 in SMS messages per month, or 155 messages.

To raise your limit, you'll need to request approval using a AWS Support Request. See the [official docs](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-awssupport-spend-threshold.html)

### Thank You

* [`phone`](https://www.npmjs.com/package/phone)
* [workerpool](https://www.npmjs.com/package/workerpool)