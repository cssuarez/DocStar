var PageOptionsDialogs = {
    // validates destination of a page reorder
    // TODO 12385 this function is wrong.  
    // First, it assumes a fully burst/fully rendered document which is not valid.
    // Second, it is unaware of user is trying to insert before or after the specified page, which is important.
    // Finally, what about scan/insert options.  Logic there should be similar; find and check it.  If it is good, copy or share it.  If not, they both need work.
    validatePageSelection: function (doc, insertPage, $dialog) {
        var info = doc.findPage(insertPage);
        if (info === null) {
            var msg = String.format(Constants.c.pageNotFound_T, insertPage);
            ErrorHandler.displayGeneralDialogErrorPopup(msg);
            DialogsUtil.cleanupDialog($dialog, undefined, true);
            return false;
        }

        var insertAtCI = info.idx;  // content item index, 0-based
        var pages = doc.get('Pages');
        var maxPageNum = pages.length;    // I'm a real number! (like pinocchio)
        if (insertAtCI < 0 || insertAtCI > maxPageNum - 1) {
            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
            ErrorHandler.addErrors({ pageOptionsPageNumber: Constants.c.pageDestinationInvalid + maxPageNum }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
            return false;
        }
        return insertAtCI;
    },
    ///<summary>
    ///formats selected pages, to form page ranges or single pages, depending on what is contained within @pagesToMove
    ///if startPage and endPage are equivalent then a single page is being added, and not a page range
    ///<param name="pagesToMove">array of pages / page ranges</param>
    ///<param name="startPage">where the page / page range begins</param>
    ///<param name="endPage">where the page / page range ends</param>
    ///</summary>
    setPagesToMove: function (pagesToMove, startPage, endPage) {
        var lastPageRange = pagesToMove[pagesToMove.length - 1];
        if (lastPageRange && isNaN(lastPageRange) && parseInt(lastPageRange.split('-')[1], 10) === startPage - 1) {
            pagesToMove[pagesToMove.length - 1] = lastPageRange.split('-')[0] + '-' + endPage;
        }
        else if (lastPageRange && !isNaN(lastPageRange) && lastPageRange === startPage - 1) {
            pagesToMove[pagesToMove.length - 1] = lastPageRange + '-' + endPage;
        }
        else if (startPage === endPage) {
            pagesToMove.push(startPage);
        }
        else {
            pagesToMove.push(startPage + '-' + endPage);
        }
        return pagesToMove;
    },
    updateMoveToPage: function (ev, $dialog) {
        // Key is a numeric key
        if ((ev.keyCode >= 48 && ev.keyCode <= 57) || ev.keyCode === 8 || ev.keyCode === 46) {
            PageOptionsDialogs.updateMovingPagesLocation($dialog);
        }
    },
    updateMovingPagesLocation: function ($dialog) {
        var pageMoveMsg = Constants.c.movingPagesTo;
        var pagesToMove = $dialog.find('.pagesToMove').val();
        var insertLocation = $dialog.find('.insertLocation:checked').val();
        var pageLocation = $dialog.find('.pageNumber').val();
        pageMoveMsg = String.format(pageMoveMsg, pagesToMove, insertLocation, pageLocation);
        $dialog.find('.movingPagesMsg').text(pageMoveMsg);
    },
    pageOptionsDialog: function (options) {
        var callbacks = options.callbacks;
        var title = (options && options.title) ? options.title : Constants.c.pageOptions;
        var okButtonText = (options && options.okText) ? options.okText : Constants.c.save;
        var cancelButtonText = (options && options.cancelText) ? options.cancelText : Constants.c.cancel;
        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
        var okFunc = function (cleanup) {
            if (callbacks && callbacks.save) {
                callbacks.save(cleanup);
            }
            else {
                Utility.executeCallback(cleanup);
            }
        };
        var cancelFunc = function (cleanup) {
            $dialog.off('change input');
            if (callbacks && callbacks.close) {
                callbacks.close();
            }
            Utility.executeCallback(cleanup);
        };
        var $pageOptions = $('#pageOptionsDialog');
        var $div = $(document.createElement('div'));
        $div.append($pageOptions.clone().show());
        var $dialog = DialogsUtil.generalPromptDialog('', okFunc, cancelFunc, {
            title: title,
            autoOpen: false,
            okText: okButtonText,
            closeText: cancelButtonText,
            width: (options && options.width) ? options.width : 500,
            minWidth: (options && options.minWidth) ? options.minWidth : 500,
            minHeight: (options && options.minHeight) ? options.minHeight : 350,
            maxHeight: (options && options.maxHeight) ? options.maxHeight : 350,
            height: (options && options.height) ? options.height : 250,
            html: $div.html(),
            open: function () {
                $dialog.on('keyup', '.pageNumber', function (ev) {
                    PageOptionsDialogs.updateMoveToPage(ev, $dialog);
                });
                $dialog.on('change', '.insertLocation', function (ev) {
                    PageOptionsDialogs.updateMovingPagesLocation($dialog);
                });
                if (callbacks && callbacks.open) {
                    callbacks.open();
                }
            },
            close: cancelFunc
        });
        return $dialog;
    },

    reorderPages: function (options) {
        // This function is passed into DocumentGetPackageCPX.reorderPages()
        // The options provided must include:
        //   document: the complete DocumentGetPackage model
        //   contentItems: the ContentItems collection found in document
        //   pages: the Pages collection found in document
        //   callback:  a function with signature, function (contentItems, cleanup) in which these parameters are:
        //      contentItems: the reordered set of contentItems as simple javascript array of objects (not a collection of models)
        //      cleanup: a function called on successful save, which should cleanup and close the dialog
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        var doc = options.document;
        var selectedThumbs = doc.get('selectedThumbs');
        var contentItems = options.contentItems.toJSON();
        var pages = options.pages.toJSON();
        var $dialog;
        var moveMsg = '';
        var burstMsg = '';
        var reorderPagesBurstMsg = Constants.c.reorderPagesBurst;
        var pagesToMove = [];
        var pagesToBurst = [];
        var diagOptions = {
            title: Constants.c.reorderPages,
            okText: Constants.c.reorderLabel,
            height: 'auto',
            callbacks: {
                open: function () {
                    $dialog.find('.burstPages, .movingPagesMsg, .splitOptions').hide();
                    $dialog.find('.reorderOptions').show();
                    $dialog.find('.pageNumber').numeric({ decimal: false });
                    moveMsg = Constants.c.pagesToMove;
                    burstMsg = Constants.c.burstPages;
                    // Determine selected Content Items from selected thumbs
                    pageRanges = doc.getPageRangesFromSelectedThumbs(selectedThumbs);
                    if (pageRanges) {
                        pagesToMove = pageRanges.pagesToMove;
                        pagesToBurst = pageRanges.pagesToBurst;
                        if (pagesToMove.length > 0) {
                            moveMsg = moveMsg.replace('{0}', pagesToMove.join(', '));
                            $dialog.find('.pagesToMove').val(moveMsg);
                            PageOptionsDialogs.updateMovingPagesLocation($dialog);
                            $dialog.find('.movingPagesMsg').show();
                        }
                        if (contentItems.length === 1 && pageRanges.burstRequired) {
                            burstMsg = String.format(reorderPagesBurstMsg, pageRanges.actualSelectedPages.join(','), pagesToMove);
                            Utility.disableButtons([Constants.c.reorderLabel]);
                            ErrorHandler.addErrors({ pageOptionsPageNumber: burstMsg }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                            return;
                        }
                        //if (pagesToBurst.length > 0) {
                        //    burstMsg = String.format(burstMsg, pagesToBurst.join(', '));
                        //    $dialog.find('.burstPages').text(burstMsg);
                        //    $dialog.find('.burstPages').show();
                        //}
                    }
                },
                save: function (cleanup) {
                    // reorder documents pages based on selected thumbnails and the content items they are contained within
                    // Can not reorder pages inside of a content item, MUST BURST   
                    //get the updated contentItems;
                    contentItems = options.contentItems.toJSON();
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    var insertAction = $dialog.find('.insertLocation:checked').val();
                    var insertPage = $dialog.find('.pageNumber').val();
                    var insertAtCI = PageOptionsDialogs.validatePageSelection(doc, insertPage, $dialog);
                    if (insertAtCI === false) {
                        return;
                    }
                    if (insertAction === Constants.c.before) {
                        insertAtCI -= 1;
                    }
                    // TODO 13009 the following ignores insertAction and therefore unnecessarily requires burst when destination is BEFORE
                    // the first page of multi-page content
                    pageRanges = doc.getPageRangesFromSelectedThumbs(['thumb_' + insertPage]);
                    if (pageRanges.burstRequired) {
                        var target = $('#thumb_' + insertPage);
                        if (target.length > 0) {
                            var burstAndReorderOpts = {
                                document: doc,
                                insertPage: insertPage,
                                insertAction: insertAction,
                                $dialog: $dialog,
                                callback: options.callback,
                                cleanup: cleanup
                            };
                            PageOptionsDialogs.burstAndReorderPages(burstAndReorderOpts);
                        }
                        return;
                    }
                    var selectedThumbs = doc.getSelectedThumbs();
                    var reorderedWithoutError = doc.reorderContentItemDTOs(contentItems, selectedThumbs, insertAtCI);
                    if (!reorderedWithoutError) {
                        if (pageRanges.burstRequired) {
                            // TODO 12385 pageRanges is at different times the source pages range and the insert-at pages.
                            // Verify that it is correctly used here.
                            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                            burstMsg = String.format(reorderPagesBurstMsg, pageRanges.actualSelectedPages.join(','), pagesToMove);
                            ErrorHandler.addErrors({ pageOptionsPageNumber: burstMsg }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                            return;
                        }
                        Utility.executeCallback(cleanup, true);
                        return;
                    }
                    options.callback(contentItems, cleanup);
                }
            }
        };
        $dialog = PageOptionsDialogs.pageOptionsDialog(diagOptions);
        $dialog.dialog('open');
    },
    burstAndReorderPages: function (options) {
        options = options || {};
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        var doc = options.document;
        var insertPage = options.insertPage;
        var insertAction = options.insertAction;
        var $reorderDialog = options.$dialog;
        var reorderCleanup = options.cleanup;
        var $dialog;
        var that = this;
        var msg = Constants.c.burstAndReorderMsg;

        var okFunc = function (cleanup) {
            var versionId = doc.versionId();
            var contentItemId = doc.findPage(insertPage).ci.get('Id');

            var sf = function () {
                var insertAtCI = PageOptionsDialogs.validatePageSelection(doc, insertPage, $dialog);
                if (insertAtCI === false) {
                    return;
                }
                if (insertAction === Constants.c.before) {
                    insertAtCI -= 1;
                }

                var contentItems = doc.get('ContentItems').toJSON();
                var pages = doc.get('Pages').toJSON();
                var pageRanges = doc.getPageRangesFromSelectedThumbs(['thumb_' + insertPage]);
                var selectedThumbs = doc.getSelectedThumbs();
                var reorderedWithoutError = doc.reorderContentItemDTOs(contentItems, selectedThumbs, insertAtCI);
                if (!reorderedWithoutError) {
                    if (pageRanges.burstRequired) {
                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                        burstMsg = String.format(reorderPagesBurstMsg, pageRanges.actualSelectedPages.join(','), pagesToMove);
                        ErrorHandler.addErrors({ pageOptionsPageNumber: burstMsg }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                        return; // early exit after displaying burst error
                    }
                    DialogsUtil.cleanupDialog($reorderDialog, null, true);
                    Utility.executeCallback(cleanup, false);
                    return;
                }
                var completeCleanup = function () {
                    Utility.executeCallback(reorderCleanup);
                    Utility.executeCallback(cleanup);
                };
                options.callback(contentItems, completeCleanup);
            };
            var ff = function (jqXHR, textStatus, errorThrown) {
                if (errorThrown) {
                    if (errorThrown.Message) {
                        errorThrown = errorThrown.Message;
                    }
                    ErrorHandler.addErrors(errorThrown, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                }
                Utility.executeCallback(cleanup);
            };

            var args = { VersionId: versionId, ContentItemId: contentItemId };
            doc.burstContentItem(args, sf, ff);
        };

        var cancelFunc = function (cleanup) {
            Utility.executeCallback(cleanup);
            Utility.executeCallback(reorderCleanup, true);
        };

        $dialog = DialogsUtil.generalPromptDialog(msg, okFunc, cancelFunc, null);
        $dialog.dialog('open');
    },
    burstContentItems: function (options) {
        options = options || {};
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        var doc = options.document;
        var versionId = doc.versionId();
        var contentItems = options.contentItems;
        var pages = options.pages;
        var dialogSelector = $('#pageOptionsDialog');
        var selectedThumbs = doc.getSelectedThumbs();
        var pageInfo = doc.findPage(selectedThumbs[selectedThumbs.length - 1].split('_')[1]);
        var allPages = pageInfo.ciPages;
        if (!allPages || allPages.length === 0) {
            ErrorHandler.addErrors(Constants.c.invalidBurstContentItem);
            return;
        }
        var contentItemId = pageInfo.ci.get('Id');
        var firstPage = allPages[0].get('TruePageNumber');
        var lastPage = allPages[allPages.length - 1].get('TruePageNumber');
        var moveMsg = String.format(Constants.c.burstPageRange, firstPage, lastPage);
        var isPageDirty = options.pageDirty;
        var $dialog;
        var diagOpts = {
            title: Constants.c.burstContentItem,
            okText: Constants.c.burstBtnLabel,
            minHeight: 300,
            height: 300,
            callbacks: {
                open: function () {
                    $dialog.parent('.ui-dialog').css('overflow', 'visible');
                    $dialog.find('.burstPages, .movingPagesMsg, .reorderOptions, .splitOptions').hide();
                    if (allPages.length <= 1) {
                        Utility.disableButton(Constants.c.burstBtnLabel);
                        ErrorHandler.addErrors({ pageOptionsError: Constants.c.invalidBurstContentItem }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                    }
                    $dialog.find('.movingPagesMsg').text(moveMsg);
                    if (isPageDirty) {
                        $dialog.find('.movingPagesMsg').append($('<br />')).append($('<i></i>').text(Constants.c.burstAnnoChanges));
                    }
                    $dialog.find('.movingPagesMsg').show();
                },
                save: function (cleanup) {
                    var sf = function () {
                        Utility.executeCallback(cleanup);
                    };
                    var ff = function (jqXHR, textStatus, errorThrown) {
                        if (errorThrownerrThrown) {
                            if (errorThrown.Message) {
                                errorThrown = errorThrown.Message;
                            }
                            ErrorHandler.addErrors(errorThrown, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass, '');
                        }
                        Utility.executeCallback(cleanup, true);
                    };
                    var burst = function () {
                        var args = { VersionId: versionId, ContentItemId: contentItemId };
                        options.callback(args, sf, ff);
                    };
                    if (isPageDirty) {
                        doc.save(null, {
                            success: function () {
                                burst();
                            }
                        });
                    }
                    else {
                        burst();
                    }
                }
            }
        };
        $dialog = PageOptionsDialogs.pageOptionsDialog(diagOpts);
        $dialog.dialog('open');
    },
    deletePagesSimple: function (options) {
        options = options || {};
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        var doc = options.document;
        var selectedThumbs = doc.getSelectedThumbs();
        var pageRanges = doc.getPageRangesFromSelectedThumbs(selectedThumbs);
        var $dialog;
        var pagesToMove;
        var pagesToBurst;
        var diagOpts = {
            title: Constants.c.deletePages,
            okText: Constants.c['delete'],
            width: 'auto',
            minWidth: 300,
            height: 150,
            callbacks: {
                open: function () {
                    $dialog.find('.burstPages, .movingPagesMsg, .reorderOptions, .splitOptions').hide();
                    var moveMsg = Constants.c.pagesToDelete;
                    if (pageRanges) {
                        pagesToMove = pageRanges.pagesToMove;
                        pagesToBurst = pageRanges.pagesToBurst;
                        if (pagesToMove.length > 0) {
                            moveMsg = String.format(moveMsg, pagesToMove.join(', '));
                            $dialog.find('.movingPagesMsg').text(moveMsg);
                            $dialog.find('.movingPagesMsg').show();
                        }
                    }
                },
                save: function (cleanup) {
                    options.callback(cleanup);
                }
            }
        };
        $dialog = PageOptionsDialogs.pageOptionsDialog(diagOpts);
        $dialog.dialog('open');
    },
    burstAndDeletePages: function (options) {
        options = options || {};
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        var msg = Constants.c.burstAndDeleteMsg;
        var $div = $(document.createElement('div'));
        $div.append($('#BurstAndDeleteDialog').clone().show());
        var that = this;
        $div.find('.BurstAndDeleteMsg').html(msg);
        var $dialog;
        var okFunc = function (cleanup) {
            options.callback(cleanup);
        };
        var diagOpts = {
            html: $div.html(),
            okText: Constants.c.yes,
            closeText: Constants.c.no,
            width: 'auto',
            minWidth: 400,
            autoOpen: false
        };
        $dialog = DialogsUtil.generalPromptDialog('', okFunc, null, diagOpts);
        $dialog.dialog('open');
    },
    splitDocument: function (options) {
        options = options || {};
        if (!options || !options.callback) {
            throw "A callback must be supplied"; //Dev usage error case. Should never make production.
        }
        var $dialog;
        // obtain document info from document meta view
        var doc = options.document;
        var pages = options.pages;
        var versionId = doc.versionId();
        // Obtain page number from cmTarget (context menu target)
        var lastSelectedPage = doc.getLastSelectedPage();
        // Find lastSelectedPage in its ContentItem
        // Determine if it can be split at that page or if it needs to be burst
        var info = doc.findPage(lastSelectedPage);
        if (!info) {
            var msg = String.format(Constants.c.pageNotFound_T, lastSelectedPage);
            ErrorHandler.displayGeneralDialogErrorPopup(msg);
            return;
        }
        var diagOpts = {
            title: Constants.c.splitDocument,
            okText: Constants.c.splitBtnLabel,
            minHeight: 300,
            height: 350,
            callbacks: {
                open: function () {
                    $dialog.find('.splitOptions').on('keyup', 'input[name="Title"]', function (event) {
                        var targ = $(event.currentTarget);
                        if (!moreSeriousWarning()) {
                            ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                            emptyNameWarning(targ);
                        }
                    });
                    $dialog.parent('.ui-dialog').css('overflow', 'visible');

                    // Disable splitting pages on first page
                    //if (info.pageIdx === 0) {
                    //}
                    // Disable deleting page on last page
                    var totPages = doc.getNumPages().pages;
                    var $deletePage = $dialog.find('.deletePage');
                    if (lastSelectedPage === totPages) {
                        $deletePage.prop('disabled', true);
                        $deletePage.prop('checked', false);
                    }
                    else {
                        $deletePage.prop('disabled', false);
                    }
                    // obtain content type of viewed document
                    var ctId = doc.getDotted('Document.ContentTypeId');
                    // Fill in the contenttype dropdown
                    var select = document.createElement('select');
                    var idx = 0;
                    var length = window.contentTypes.length;
                    for (idx; idx < length; idx++) {
                        var opt = document.createElement('option');
                        var ct = window.contentTypes.at(idx);
                        if (ct.get('Id') === ctId) {
                            opt.selected = true;
                        }
                        opt.textContent = ct.get('Name');
                        opt.value = ct.get('Id');
                        select.appendChild(opt);
                    }
                    // Fill in pages options dialog
                    $dialog.find('.contentType').append(select.innerHTML);
                    $dialog.find('.burstPages, .movingPagesMsg, .reorderOptions').hide();
                    $dialog.find('.splitOptions').show();
                    var moveMsg = Constants.c.pagesToSplit;
                    moveMsg = String.format(moveMsg, lastSelectedPage);
                    var pageRanges = doc.getPageRangesFromSelectedThumbs(['thumb_' + lastSelectedPage]);
                    if (pageRanges) {
                        var pagesToMove = pageRanges.pagesToMove;
                        if (pagesToMove.length > 0) {
                            var newPageToSplitAt = parseInt(pagesToMove.join(',').split('-')[0], 10);
                            if (newPageToSplitAt === lastSelectedPage && newPageToSplitAt !== 1) {
                                moveMsg = String.format(moveMsg, lastSelectedPage);
                            }
                            else {
                                // any multipage content item cannot be split
                                if (info.ciPages && info.ciPages.length > 1) {
                                    moveMsg = Constants.c.splitPageInContentItem;
                                    moveMsg = String.format(moveMsg, newPageToSplitAt, lastSelectedPage);
                                    lastSelectedPage = newPageToSplitAt;
                                }
                                if (parseInt(newPageToSplitAt, 10) === 1) {
                                    if (!info.ciPages || info.ciPages.length === 1) {
                                        moveMsg = '';
                                    }
                                    Utility.disableButton(Constants.c.splitBtnLabel);
                                    ErrorHandler.addErrors({ pageOptionsError: String.format(Constants.c.invalidSplitPage, newPageToSplitAt) }, css.warningErrorClass, css.warningErrorClassTag, css.inputErrorClass);
                                }
                            }
                        }
                    }
                    $dialog.find('.movingPagesMsg').text(moveMsg);
                    $dialog.find('.movingPagesMsg').show();
                    var moreSeriousWarning = function () {
                        var pageOptWarning = $dialog.find('input[name="pageOptionsError"]').siblings('.warningErrorClass');
                        return pageOptWarning && pageOptWarning.length > 0;
                    };
                    var emptyNameWarning = function (targ) {
                        if (!$.trim(targ.val())) {
                            // Disable 'split' button
                            Utility.disableButton(Constants.c.splitBtnLabel, Constants.c.enterATitle);
                            ErrorHandler.addErrors({ 'Title': Constants.c.enterATitle }, css.warningErrorClass, null, css.inputErrorClass, null);
                        }
                        else {
                            // Enable 'split' button
                            Utility.enableButton(Constants.c.splitBtnLabel, 'Split');
                        }
                    };
                    if (!moreSeriousWarning()) {
                        ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                        emptyNameWarning($dialog.find('input[name="Title"]'));
                    }
                },
                save: function (cleanup) {
                    var splitOptions = DTO.getDTO($dialog);
                    ErrorHandler.removeErrorTags(css.warningErrorClass, css.inputErrorClass);
                    if (splitOptions.Title === Constants.c.newTitle) {
                        ErrorHandler.addErrors({ Title: String.format(Constants.c.newNameWarning, Constants.t('newTitle')) });
                        Utility.executeCallback(cleanup, true);
                        return false;
                    }
                    options.callback(lastSelectedPage, splitOptions, cleanup);
                },
                close: function (cleanup) {
                    $dialog.find('.splitOptions').off('keyup');
                    Utility.executeCallback(cleanup);
                }
            }
        };
        $dialog = PageOptionsDialogs.pageOptionsDialog(diagOpts);
        $dialog.dialog('open');
    }
};