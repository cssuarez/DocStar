/// <summary>
/// Inter-Window / Iframe communication mechanism. Can be used in an iframe to send messages to a parent, a parent to send messages to an iframe, a window to another window (window.open), and another window back to the opener. 
/// Prevents security issues when the iframe domain is not exactly the same as the pages domain.
/// Some browsers support the data property as an object, others do not, this class will serialize and deserialize the data to avoid this issue.
/// </summary>
/// <param name="options">
///                      { 
///                         messageReceived: Callback when a message is received from the target,
///                         target: The other window to post the message to. 
///                         targetDomain: domain of the target window. You can use * to have unrestricted communication.
///                         messageId: provided by our main JS, not by the iframe. There may be many post message helpers in our main JS but there will only ever be 1 per iframe. This will be used to ensure the correct message is delivered to the correct post message helper instance in our main JS.
///                       }
/// </param>
PostMessageHelper = function (options) {
    var me;
    var preIdQueue = [];
    var intervalId;
    var messageReceived = function (event) {
        if (event.data) {
            event.dataObj = JSON.parse(event.data);
        }
        //Check for the main JS sending us its messageId
        if (event.dataObj && event.dataObj.InitMessageId) {
            options.messageId = event.dataObj.messageId;
            while (preIdQueue.length > 0) { //Send any queued messages in the order they were received. 
                var sendData = preIdQueue.shift();
                sendMessage(sendData);
            }
        }
        else if (options.messageReceived && event.dataObj.messageId === options.messageId) { //Ensure this instance is the target of the message.
            //Undo boxing that may have been done in sendMessage
            if (event.dataObj.hasOwnProperty('originalString')) {
                event.data = event.dataObj.originalString;
                if (event.data) {
                    event.dataObj = JSON.parse(event.data);
                }

            }
            options.messageReceived(event, me);
        }
    };
    var sendMessage = function (data) {
        if (!options.messageId) {
            preIdQueue.push(data); //Cannot send a message until a message Id has been received.
            return;
        }

        if (data instanceof Object) {
            data.messageId = options.messageId;
            data = JSON.stringify(data);
        } else {
            //Not an object, box it into one, it will be unboxed in messageReceived. 
            data = JSON.stringify({
                originalString: data,
                messageId: options.messageId
            });
        }
        options.target.postMessage(data, options.targetDomain);
    };
    var close = function () {
        if (intervalId !== undefined) {
            clearInterval(intervalId);
        }
        if (window.removeEventListener) {
            window.removeEventListener('message', messageReceived, false);
        } else {
            window.detachEvent('onmessage', messageReceived);
        }
        me = undefined; //I've lost myself.
    };
    if (window.addEventListener) {
        addEventListener("message", messageReceived, false);
    }
    else {
        attachEvent("onmessage", messageReceived);
    }
    //If a message Id is provided send it to the iframe so it can send replies with the message id included.
    if (options.messageId) {
        //Send the messageId to the iframe every half second. This is done for 2 reasons:
        //1) We don't know when the iframe has loaded and bound its onmessage event listener
        //2) The iframe does a form submit which reloads the iframe and loses its message id, this will reset it after it has loaded.
        intervalId = setInterval(function () {
            try {
                sendMessage({ InitMessageId: true });
            }
            catch (ex) { } //While a window has yet to be loaded we will receive permission denied errors, we don't want these showing up so we swallow them.
        }, 500);
    }
    me = {
        sendMessage: sendMessage,
        close: close
    };
    return me;
};