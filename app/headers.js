// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var tabId = parseInt(window.location.search.substring(1));
var currrentDomain = '';

window.addEventListener("load", function() {
  chrome.debugger.sendCommand({tabId:tabId}, "Network.enable");
  chrome.debugger.onEvent.addListener(onEvent);
});

window.addEventListener("unload", function() {
  chrome.debugger.detach({tabId:tabId});
});

new Clipboard('.clipboard-button');

var requests = {};

function onEvent(debuggeeId, message, params) {
  if (tabId != debuggeeId.tabId)
    return;

  if (message == "Network.requestWillBeSent") {
    var checkUrl = params.request.url;
    if (ignoreUrl(checkUrl, params.type)) { return; }
    var requestDiv = requests[params.requestId];
    if (!requestDiv) {
      var requestDiv = document.createElement("div");
      requestDiv.className = "request";
      requests[params.requestId] = requestDiv;
      var urlLine = document.createElement("div");
      urlLine.textContent = params.request.url;
      requestDiv.appendChild(urlLine);
    }

    if (params.redirectResponse)
      appendResponse(params.requestId, params.redirectResponse);

    var requestLine = document.createElement("div");
    var urlObj = parseURL(params.request.url);
    requestLine.textContent = "\n" + params.request.method + " " +
        urlObj.path;
    requestDiv.appendChild(requestLine);
    var queryStringParams = parseQueryString(params.request);
    if (queryStringParams.params) {
      appendPostData(params.requestId, '\n'+YAML.stringify(queryStringParams.params, 2)+'\n', params);
    }
    if (params.request.postData) {
      var postData = document.createElement("div");
      var postDataObject = JSON.parse(params.request.postData);
      var yamlPostData = YAML.stringify(postDataObject, 10);
      appendPostData(params.requestId, yamlPostData, params);
    }
  } else if (message == "Network.responseReceived") {
    var requestDiv = requests[params.requestId];
    if (!requestDiv) {
      var requestDiv = document.createElement("div");
      requestDiv.className = "request";
      requests[params.requestId] = requestDiv;
      var urlLine = document.createElement("div");
      urlLine.textContent = params.request.url;
      requestDiv.appendChild(urlLine);
    }
    document.getElementById("data_container").appendChild(requests[params.requestId]);
    appendResponse(params.requestId, params.response);
  }
}

function appendPostData(requestId, postData, paramsObj) {
  var requestDiv = requests[requestId];
  var postDataDiv = document.createElement("div");
  postDataDiv.setAttribute("id", requestId);
  postDataDiv.textContent = postData;
  postDataDiv.value = postData;
  requestDiv.appendChild(postDataDiv);
  var clipboardButtonId = 'clipboard-'+requestId;
  var clipboard = new Clipboard('#'+clipboardButtonId);

  var clipboardApplyButton = document.createElement("button");
  clipboardApplyButton.setAttribute("class", "clipboard-button");
  clipboardApplyButton.innerText = "applyCouponUrl";
  clipboardApplyButton.dataset.clipboardText = `
  applyCouponUrl:
    url: ${paramsObj.request.url}
    mode: ${paramsObj.request.method}
    reApplyOnSuccess: true
    dataType: object
    codeProperty: _CODE_
    data:
        \t${postData}
  `;

  var clipboardClearButton = document.createElement("button");
  clipboardClearButton.setAttribute("class", "clipboard-button");
  clipboardClearButton.innerText = "clearCouponUrl";
  clipboardClearButton.dataset.clipboardText = `
  clearCouponUrl:
    url: ${paramsObj.request.url}
    mode: ${paramsObj.request.method}
    reApplyOnSuccess: true
    dataType: object
    codeProperty: _CODE_
    data:
        \t${postData}
  `;

  var clipboardResultButton = document.createElement("button");
  clipboardResultButton.setAttribute("class", "clipboard-button");
  clipboardResultButton.innerText = "resultUrl";
  clipboardResultButton.dataset.clipboardText = `
  resultUrl:
    url: ${paramsObj.request.url}
    mode: ${paramsObj.request.method}
    reApplyOnSuccess: true
    dataType: object
    codeProperty: _CODE_
    data:
        \t${postData}
  `;

  requestDiv.appendChild(clipboardApplyButton);
  requestDiv.appendChild(clipboardClearButton);
  requestDiv.appendChild(clipboardResultButton);
}

function appendQueryParams(requestId, response) {
  var requestDiv = requests[requestId];
  var queryParamsDiv = document.createElement("div");
  queryParamsDiv.textContent = response;
  requestDiv.appendChild(queryParamsDiv);
}

function appendResponse(requestId, response) {
  var requestDiv = requests[requestId];
  // requestDiv.appendChild(formatHeaders(response.requestHeaders));

  var statusLine = document.createElement("div");
  if (response.status == 200) {
    statusLine.style.backgroundColor = '#5fba7d';
  } else {
    statusLine.style.backgroundColor = '#FF8C00';
  }
  statusLine.textContent = response.status + " " +
      response.statusText;
  requestDiv.appendChild(statusLine);
}

function formatHeaders(headers) {
  var text = "";
  for (name in headers)
    text += name + ": " + headers[name] + "\n";
  var div = document.createElement("div");
  div.textContent = text;
  return div;
}

function parseURL(url) {
  var result = {};
  var match = url.match(
      /^([^:]+):\/\/([^\/:]*)(?::([\d]+))?(?:(\/[^#]*)(?:#(.*))?)?$/i);
  if (!match)
    return result;
  result.scheme = match[1].toLowerCase();
  result.host = match[2];
  result.port = match[3];
  result.path = match[4] || "/";
  result.fragment = match[5];
  return result;
}

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

function ignoreUrl(url, type) {
  var ending = url.split('.').pop();
  if (['js', 'png', 'jpg', 'css', 'woff2', 'woff'].indexOf(ending) >= 0) {
    return true;
  }
  return false;
}

function ignoreType(type) {
  if (['Image', 'Stylesheet', 'Media', 'Font', 'Script'].indexOf(type) >= 0) {
    return true;
  }
  return false;
}