# slack-weatherbot
A [Node.js](https://nodejs.org/en/)-based service that responds to the custom Slack command ```/forecast <zipcode>```. Slack-weatherbot looks up the forecast info by zip code, utilizing the [developer API](https://www.wunderground.com/weather/api/d/docs?d=index&MR=1) provied by Weather Underground.

## Overview
I implemented this using the Node.js and the [Express](https://expressjs.com/) application framework. This project relies on the following modules which can be installed via **npm**.
* express
* url
* body-parser
* request

### Usage
To use, Slack must issue the 'slash' command ```/forecast <zipcode>``` as a POST to the slack-weatherbot service. The service will return a payload of the following form

```json
 {
  "response_type": "in_channel",
    "attachments": [
      {
        "text": "Location: "<provided zipcode || default>",
        "image_url": "<forecast_image_url>"
      }
    ]
  }
```

If no zip code is provided, the service defaults to zip code 78751 (Austin, TX). The input is validated and any non-5-digit inputs are rejected with an error message to the issuer. If the zip code does not exist in the U.S., a different error message will notify the user.

The slack-weatherbot returns two forecasts, one for the day, and one for the next night. To do this, I used the *multiple responses* capability of Slack via the POST callback_url provided in the original request. (This is as opposed to the inline result you can provide directly via the response which only supports 1 message.)

### Installation 
Running the slack-weatherbot service is as simple as executing ```node weatherman.js```. However, in order to get it up and running behind an internet-routable DNS name, I added a DNS CNAME to map **slackcommands.tpetz.com** to my existing DNS entry for tpetz.com. This is because I have several different webservers running on my single Linode server and I wanted this to be served in it's own VirtualHost. The following **apache2** configuration creates a proxy that passes all requests to slackcommands.tpetz.com onto my node server running on localhost:3338.

```$xslt
<VirtualHost *:80>
    ServerName slackcommands.tpetz.com
    ServerAlias slackcommands.tpetz.com
    ServerAdmin webmaster@localhost
 
    ProxyPass / http://127.0.0.1:3338/
    ProxyPassReverse / http://127.0.0.1:3338/
    ProxyRequests Off 
    ProxyPreserveHost On
</VirtualHost>
```
This installation allowed me to configure the slash command using URL: http://slackcommands.tpetz.com/forecast for the POST. 

### Configuration
The Weather Underground API requires an ```WEATHER_API_KEY``` which is provided as a hardcoded string in the code. Normally the service would also check the incoming Slack TOKEN to protect against unauthorized use, but I am not currently checking the Token in case anyone wants to test against my running slack-weatherbot by configuring their own "/forecast" slash command. 

To test the service, configure Slack to send a 5 digit zip code to http://slackcommands.tpetz.com/forecast via a custom Slash command.

### Known Issues
* The ```WEATHER_API_KEY``` is hardcoded in the source code which is a security concern, it would be better to provide it via an ENV variable but this would complicate testing somewhat so I've left it in for now.
* The service only supports U.S. zip codes, a future version could easily support city-based lookups using a different WeatherUnderground API for the back-end call.

### References
The following were especially helpful resources:
* https://api.slack.com/slash-commands
* https://www.wunderground.com/weather/api/d/docs?d=index&MR=1
* https://mager.co/how-to-write-a-slackbot-in-40-lines-of-code-52cf0c4fcf42
* http://www.girliemac.com/blog/2016/10/24/slack-command-bot-nodejs/
