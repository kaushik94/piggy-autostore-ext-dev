'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

var bkg = chrome.extension.getBackgroundPage();
var currentDomain = '';
var version = '1.0';

function parseQueryString (params) {
  var url = params.url;
  var body = params.postData;
  var urlParams = url.split('?');
  var parsedParameters = {};
  if (urlParams.length === 2) {
    var uriParameters = urlParams[1].split('&');
    for (var i = 0; i < uriParameters.length; i++) {
      var parameter = uriParameters[i].split('=');
      parsedParameters[parameter[0]] = decodeURIComponent(parameter[1]);
    }

    return {url: urlParams[0], params: parsedParameters};
  } else if (body && body.split('&').length > 1){
    var uriParameters = body.split('&');
    for (var i = 0; i < uriParameters.length; i++) {
      var parameter = uriParameters[i].split('=');
      parsedParameters[parameter[0]] = decodeURIComponent(parameter[1]);
    }

    return {url: urlParams[0], params: parsedParameters};
  }
  return {url: url, params: false};
}

function extractDomain(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf('://') > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
}
function hasSameOrigin(url) {
	if (!currentDomain.length) { return false; }
	return url.indexOf(currentDomain) != -1;
}
chrome.webRequest.onBeforeRequest.addListener(
    function(details)
    {
    	var result = {};
    	var queryUrl = details.url;
    	if (hasSameOrigin(extractDomain(queryUrl))) {
  			var queryParams = parseQueryString(details);
  			if (queryParams.params) {
  				result['queryParams'] = queryParams.params;
  			}
  			if (details.requestBody && !details.requestBody.error) {
  				result['requestBody'] = details.requestBody.formData;
  			}
    	}
    	return result;
    },
    {urls: [ '<all_urls>' ]},
    ['requestBody']
);

chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.debugger.attach({tabId:tab.id}, version,
      onAttach.bind(null, tab.id));
});

function normaliseFormData(data) {
	var formSplit = data.split('&');
	if (formSplit.length) {
		console.log(formSplit);
	}
}
function onAttach(tabId) {
  if (chrome.runtime.lastError) {
    alert(chrome.runtime.lastError.message);
    return;
  }

  chrome.windows.create(
      {url: 'headers.html?' + tabId, type: 'popup', width: 800, height: 600});
}