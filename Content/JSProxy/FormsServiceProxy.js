var FormsServiceProxy = function (options) {
    //All vars and functions are privately scoped if not defined within the return object.
    var spc = ServiceProxyCore('/AstriaV2/Forms.svc/rest', options);
    //Public functions 
    return {
        setCacheDuration: function (timeToCache) {
            spc.setCacheDuration(timeToCache);
        },
        getTemplatesSlim: function (successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GetTemplatesSlim', 'POST', null, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        getFormTemplatePackage: function (formTemplateId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('Get', 'POST', formTemplateId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        create: function (formTemplatePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('Create', 'POST', formTemplatePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        update: function (formTemplatePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('Update', 'POST', formTemplatePackage, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        'delete': function (formTemplateId, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('Delete', 'POST', formTemplateId, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        generateHtmlElements: function (formHtmlElementGenerationArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GenerateHtmlElements', 'POST', formHtmlElementGenerationArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        generatePartBody: function (formPartBodyGenerationArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('GeneratePartBody', 'POST', formPartBodyGenerationArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        createDocument: function (formDocumentCreateArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('CreateDocument', 'POST', formDocumentCreateArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        },
        parseFormula: function (parseFormulaArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers) {
            spc.queueAjaxCall('ParseFormula', 'POST', parseFormulaArgs, successFunc, failureFunc, completeFunc, cancellationToken, headers);
        }
    };
};