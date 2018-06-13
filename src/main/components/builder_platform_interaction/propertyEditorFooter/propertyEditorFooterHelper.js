({  
    handleUpdateNodeOnOk: function(cmp) {
        cmp.set('v.isSaveDisabled', true);
        var panelInstance = cmp.get('v.panelInstance');
        var propertyEditor = panelInstance.get('v.body')[0];
        if (propertyEditor && propertyEditor.isValid()) {
            var validationErrors = propertyEditor.get("v.body")[0].validate();
            if (validationErrors) {
                if (validationErrors.length === 0) {
                    var nodeUpdate = propertyEditor.get("v.nodeUpdate");
                    var node = propertyEditor.get("v.body")[0].getNode();
                    if (node && nodeUpdate) {
                        nodeUpdate(node);
                        this.closePanel(cmp);
                    }
                } else if (validationErrors.length > 0 ) {
                    var errors = [];
                    for (var i = 0, len = validationErrors.length; i < len; i++) {
                        errors.push({
                            // TODO : talk about key(devName) to actual label in error messages, will be finalized as part of this work item 
                            messages:validationErrors[i].key + ": " + validationErrors[i].errorString
                            });
                    }
                    cmp.set('v.isSaveDisabled', false);
                    var statusIconCmp = cmp.find('statusIcon');
                    
                    // If status icon cmp and panel is there close the existing one and create a new one with a new set of errors
                    if (statusIconCmp && statusIconCmp.getPanelInstance()) {
                        statusIconCmp.closePanelInstance().then(function(){
                            cmp.set('v.messages', errors);
                        });
                    } else { // just set the errors and wait for the panel to show up
                        cmp.set('v.messages', errors);
                    }
                }
            }
        } 
    },
    
    closePanel: function(cmp) {
        var closeActionCallback = cmp.get('v.closeActionCallback');
        var panelInstance = cmp.get('v.panelInstance');
        cmp.getEvent('notify').setParams({
            action: 'closePanel',
            typeOf: 'ui:closePanel',
            callback: closeActionCallback(panelInstance)
        }).fire();
    },
   
})