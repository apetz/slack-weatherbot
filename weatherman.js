var express = require('express');
var app = express();
var url = require('url');
var bodyParser = require('body-parser');
var request = require('request');

var WEATHER_API_KEY = 'dda7ce7b54af2cb4';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('port', (process.env.SLACK_PORT || 3338));

app.post('/forecast', function(req, res) {
    var zipCode = req.body.text;
    var token = req.body.token; // unused for now, but I can use this to verify that calls are coming only from authorized Slack clients
    var responseUrl = req.body.response_url;

    // validate the input and assign default value if not provided
    if (zipCode === "") zipCode = 78751; // defaults to Austin, TX if no zip code is provided
    var isValid = /(^\d{5}$)/.test(zipCode);
    if (!isValid) {
        res.send("Invalid zipcode. Try again. Hint: it's a 5 digit number. :frowning:");
        return;
    }

    // grab the forecast from Weather Underground using the API Key
    var weather_url = url.format({
        pathname: 'http://api.wunderground.com/api/' + WEATHER_API_KEY + '/forecast/q/' + zipCode + '.json'
    });

    console.log("Requesting: " + weather_url);

    request(weather_url, function (error, response, body) {

        if (!error && response.statusCode == 200) {
            var forecast = JSON.parse(body);
            // check to see if the results are valid by checking to see if we have an error field defined
            if (forecast.response.error) {
                var errString = "Encountered error while processing the request: " + forecast.response.error.description;
                res.send(errString);
                return;
            }
            res.send(); // empty reponse for now so we don't leave the connection hanging

            // aggregate details on 2 days/nights of the 10+ day forecast
            forecast = forecast.forecast;
            var forecast1 = forecast.txt_forecast.forecastday[0].title + " : " + forecast.txt_forecast.forecastday[0].fcttext;
            var iconUrl1 = forecast.txt_forecast.forecastday[0].icon_url;
            var forecast2 = forecast.txt_forecast.forecastday[1].title + " : " + forecast.txt_forecast.forecastday[0].fcttext;
            var iconUrl2 = forecast.txt_forecast.forecastday[1].icon_url;

            // send the first forecast (today probably), then send the second in a follow-up message. Two messages are
            // required since one response can only contain 1 icon, and I wanted to display two different icons for the
            // two distinct forecasts.
            sendForecast(zipCode, forecast1, iconUrl1, responseUrl);
            // this is inelegant but wait just a sec here to ensure that forecast 1 arrives before forecast 2, otherwise
            // sometimes the 2nd one appears before the 1st
            setTimeout(function() {
                sendForecast(zipCode, forecast2, iconUrl2, responseUrl)
            }, 500);

        } else {
            res.send("Error while accessing WeatherUnderground: " + error);
        }
    });
});

/**
 * This function sends the forecast via POST to the provided Slack response_url
 */
function sendForecast(zipCode, forecast, iconUrl, responseUrl) {
    console.log("Sending forecast to: " + responseUrl);
    var body = {
        response_type: "in_channel",
        "attachments": [
            {
                "text": "Location: " + zipCode + "\n" + "Forecast: " + forecast,
                "image_url": iconUrl,
            }
        ]
    };
    request({
            url: responseUrl,
            method: 'POST',
            json: body
        },
        function (error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log(body)
            }
            else {

                console.log("error: " + error)
                console.log("response: " + response)
            }
        });
}

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));

});
