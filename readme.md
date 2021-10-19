# AWS SMS Blast

Powerful SMS batch sending for the command line, powered by [AWS SNS text messaging](https://docs.aws.amazon.com/sns/latest/dg/sms_publish-to-phone.html).


* 🤗 Forgiving phone number parsing with landline rejection.
* 🤖 Filters out duplicate phone numbers
* 🤓 Variable interpolation ("Hey {name}, your order will ship on...")
* ⏰ Smart progress bar with ETA
* 🤑 AWS cost estimation _before_ sending, with interactive prompt.
* 🚀 Fully multithreaded message dispatch

> ❗️ *Please note:* Access to AWS SNS text messaging is tightly regulated by Amazon to prevent abuse. To send any useful amount of messages (> 155/month), you'll need to [apply for access](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-awssupport-spend-threshold.html))

## Installation

Just clone the repo.

## Usage

### Setup
  * Create and configure `.env.json` with your AWS credentials (Copy `.example.env.json` and customize)
  * Create a `data` directory in project root

### On every run:
1. In `./data`, add:
  * A CSV file `recipients.csv` containing the column `phone` (All other columns will be ignored, although you can interpolate variables from them)
  * Text file: `template.txt` 
2. `npm run send`

Here's what output looks like:

```
🏎  Start!

🌀 Reading recipient CSV file (.././data/recipients.csv)
📂 Found 1 recipient

🔬 Checking message...
ℹ️ "Hey {name}. Your order will be delivered on Friday, between 6 AM - 2PM."
✅ Message is ASCII only
✅ Message byte length is 88 (Limit is 140)

ℹ️ Phone numbers without a international country code will be assumed to be North American (+1)

🔬 Validating 1 recipients...
✅ All phone numbers normalized
✅ No duplicates found
✅ Recipient validation complete

✅ All validations passed
🌍 Total recipients: 1

⏰ Estimated send time: 0.25s
💸 Estimated AWS price to send: $0.00847

🚀 Ready to send to 1 recipients? [y/n] y

🚀 Sending 1 messages...
🧵 16 threads
1/1 = (100%) 0.0

✅ All messages sent (0.265s)
🌙 That's all, folks!
```

### Recipients file

* Must be named `recipients.csv`
* Must contain a text column `phone`
* All other column data can be interpolated into the message text (see below)

The `phone` column is forgiving with input formatting. So `123-456-7890`, `(123) 456-7890`, and `+44 123 456 7890` are all acceptable.

(See [this library](https://www.npmjs.com/package/phone) for exact phone syntax and limitations)

Example:
```csv
firstName,lastName,phone
Iarwain,Ben Adar,(123)456-7890
```


### Message 

Your message should be a simple text file `./data/template.txt`.
You can interpolate variables from your `recipients.csv` with `{name}` syntax.

(See [this package](https://www.npmjs.com/package/string-template)) for exact interpolation syntax)

Example:

`recipients.csv`
```csv
firstName,lastName,phone
Iarwain,Ben Adar,(123)456-7890
```

`template.txt`
```txt
Your name is {firstName} {lastName}
```

Final text output:
```text
Your name is Iarwain Ben Adar
```


#### Message size limits

Your message is subject to the limits of SMS messages.
Message length must be under 140 bytes. This is 140 ASCII characters.

Longer messages will be split by SNS into separate messages, each of which will be billed individually.

See the [official SNS docs](https://docs.aws.amazon.com/sns/latest/dg/sms_publish-to-phone.html).

> If your template text is too long, the process will refuse to continue.

### Sending

If all validations pass, you'll be presented with the estimated cost of sending in USD, and a time estimate. You'll be prompted to confirm that yu really want to send.

If you confirm, the script will spawn a bunch of workers and will submit your messages to Amazon SNS. Messages typically arrive within seconds.

You'll be shown a true progress bar with live ETA while your messages are being submitted.

That's all, folks!

### Appendix

#### Why multithreading?

Amazon SNS text messaging does not support bulk sending. This means that a separate API call must be made for every message. So 1000 recipients = 1000 API calls.

Additionally, SNS imposes a 100 requests/second limit.

We solve this by spawning worker threads that send the messages in parallel. A worker pool prevents too many messages from being sent at once.

> A potential workaround was to generate a throwaway SNS Topic, subscribe all the phone numbers to the topic, and then send a single message to the topic, which SNS would deliver to all phone numbers. Unfortunately SNS subscriptions do not support bulk signup either, so we'd need to make the same amount of API calls. 

#### Applying for SNS bulk limits

❗️ All AWS accounts are limited by up to $1 in SMS messages per month, or 155 messages.

To raise your limit, you'll need to request approval using a AWS Support Request. See the [official docs](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-awssupport-spend-threshold.html)

### Thank You

* [Papa Parse](https://github.com/mholt/PapaParse) Powerful CSV parsing
* [`phone`](https://www.npmjs.com/package/phone) Normalizes input phone numbers (even obscure international ones)
8 [`string-template`](https://www.npmjs.com/package/string-template) Runs variable interpolation
* [yesno](https://www.npmjs.com/package/yesno) Powers interactive prompts
* [progress](https://www.npmjs.com/package/progress) Provides the CLI progress bar
* [async/queue](https://www.npmjs.com/package/async) Makes multithreaded requests a breeze
* [Amazon SNS](https://docs.aws.amazon.com/sns/latest/dg/sms_publish-to-phone.html) Sends the actual messages
