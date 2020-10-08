// @ts-nocheck
import {
    UPDATE_FLOW,
    DO_DUPLICATE,
    ADD_CANVAS_ELEMENT,
    UPDATE_CANVAS_ELEMENT,
    DELETE_ELEMENT,
    ADD_CONNECTOR,
    ADD_RESOURCE,
    UPDATE_RESOURCE,
    DELETE_RESOURCE,
    UPDATE_VARIABLE_CONSTANT,
    SELECT_ON_CANVAS,
    TOGGLE_ON_CANVAS,
    DESELECT_ON_CANVAS,
    MARQUEE_SELECT_ON_CANVAS,
    HIGHLIGHT_ON_CANVAS,
    ADD_DECISION_WITH_OUTCOMES,
    MODIFY_DECISION_WITH_OUTCOMES,
    MODIFY_START_WITH_TIME_TRIGGERS,
    ADD_WAIT_WITH_WAIT_EVENTS,
    MODIFY_WAIT_WITH_WAIT_EVENTS,
    UPDATE_RECORD_LOOKUP,
    ADD_SCREEN_WITH_FIELDS,
    MODIFY_SCREEN_WITH_FIELDS,
    ADD_START_ELEMENT,
    UPDATE_CANVAS_ELEMENT_LOCATION,
    UPDATE_FLOW_ON_CANVAS_MODE_TOGGLE,
    ADD_PARENT_WITH_CHILDREN,
    MODIFY_PARENT_WITH_CHILDREN,
    ADD_CHILD
} from 'builder_platform_interaction/actions';
import { isDevNameInStore } from 'builder_platform_interaction/storeUtils';
import { updateProperties, omit, addItem } from 'builder_platform_interaction/dataMutationLib';
import { getConfigForElementType } from 'builder_platform_interaction/elementConfig';
import { getSubElementGuids } from './reducersUtils';
import { CanvasElement, ChildElement, Guid, StoreState } from 'builder_platform_interaction/flowModel';

/**
 * Reducer for elements.
 *
 * @param {Object} state - elements in the store
 * @param {Object} action - with type and payload
 * @return {Object} new state after reduction
 */
/* eslint-disable-next-line complexity */
export default function elementsReducer(state = {}, action) {
    switch (action.type) {
        case UPDATE_FLOW:
        case UPDATE_FLOW_ON_CANVAS_MODE_TOGGLE:
            return { ...action.payload.elements };
        case DO_DUPLICATE:
            return _duplicateElement(
                state,
                action.payload.canvasElementGuidMap,
                action.payload.childElementGuidMap,
                action.payload.connectorsToDuplicate,
                action.payload.unduplicatedCanvasElementsGuids
            );
        case ADD_CANVAS_ELEMENT:
        case ADD_START_ELEMENT:
        case ADD_RESOURCE:
        case UPDATE_CANVAS_ELEMENT:
        case UPDATE_RESOURCE:
            return _addOrUpdateElement(state, action.payload.guid, action.payload);
        case UPDATE_CANVAS_ELEMENT_LOCATION:
            return _updateCanvasElementsLocation(state, action.payload);
        case UPDATE_VARIABLE_CONSTANT:
            return _updateVariableOrConstant(state, action.payload.guid, action.payload);
        case UPDATE_RECORD_LOOKUP:
            return _updateRecordLookup(state, action.payload.guid, action.payload);
        case DELETE_ELEMENT:
            return _deleteAndUpdateElements(state, action.payload.selectedElements, action.payload.connectorsToDelete);
        case ADD_CONNECTOR:
            return _updateElementOnAddConnection(state, action.payload);
        case DELETE_RESOURCE:
            if (
                action.payload.selectedElements &&
                action.payload.selectedElements.length > 0 &&
                action.payload.selectedElements[0]
            ) {
                state = omit(state, action.payload.selectedElements[0].guid);
            }
            return state;
        case SELECT_ON_CANVAS:
            return _selectCanvasElement(state, action.payload.guid);
        case TOGGLE_ON_CANVAS:
            return _toggleCanvasElement(state, action.payload.guid);
        case DESELECT_ON_CANVAS:
            return _deselectCanvasElements(state);
        case MARQUEE_SELECT_ON_CANVAS:
            return _marqueeSelect(
                state,
                action.payload.canvasElementGuidsToSelect,
                action.payload.canvasElementGuidsToDeselect
            );
        case HIGHLIGHT_ON_CANVAS:
            return _highlightCanvasElement(state, action.payload.guid);
        case ADD_DECISION_WITH_OUTCOMES:
        case MODIFY_DECISION_WITH_OUTCOMES:
        case ADD_WAIT_WITH_WAIT_EVENTS:
        case MODIFY_WAIT_WITH_WAIT_EVENTS:
        case MODIFY_START_WITH_TIME_TRIGGERS:
        case ADD_PARENT_WITH_CHILDREN:
        case MODIFY_PARENT_WITH_CHILDREN:
            return _addOrUpdateCanvasElementWithChildElements(
                state,
                action.payload.canvasElement,
                action.payload.deletedChildElementGuids,
                action.payload.childElements
            );
        case ADD_CHILD:
            return _addChildElement(state, action.payload.parentGuid, action.payload.element);
        case ADD_SCREEN_WITH_FIELDS:
        case MODIFY_SCREEN_WITH_FIELDS:
            return _addOrUpdateScreenWithScreenFields(
                state,
                action.payload.screen,
                action.payload.deletedFields,
                action.payload.fields
            );

        default:
            return state;
    }
}

/**
 * Helper function to duplicate the selected canvas elements and any associated child elements.
 *
 * @param {Object} state - current state of elements in the store
 * @param {Object} canvasElementGuidMap - Map of selected canvas elements guids to a newly generated guid that will be used as
 * the guid for the duplicate element
 * @param {Object} childElementGuidMap - Map of child element guids to newly generated guids that will be used for
 * the duplicated child elements
 * @param {Object[]} connectorsToDuplicate - Array containing connectors that need to be duplicated
 * @return {Object} new state after reduction
 * @private
 */
function _duplicateElement(
    state,
    canvasElementGuidMap = {},
    childElementGuidMap = {},
    connectorsToDuplicate = [],
    unduplicatedCanvasElementsGuids = []
) {
    let newState = Object.assign({}, state);

    const elementGuidsToDuplicate = Object.keys(canvasElementGuidMap);
    const childElementGuidsToDuplicate = Object.keys(childElementGuidMap);
    const blacklistNames = [];
    const childElementNameMap = _getDuplicateChildElementNameMap(
        newState,
        childElementGuidsToDuplicate,
        blacklistNames
    );

    // Deselect all the unduplicated elements
    unduplicatedCanvasElementsGuids.forEach((guid) => _deselectElement(newState[guid], newState));

    for (let i = 0; i < elementGuidsToDuplicate.length; i++) {
        const selectedElement = newState[elementGuidsToDuplicate[i]];
        // Deselect each element to be duplicated (since the duplicated elements will now be selected)
        _deselectElement(selectedElement, newState);

        // Figure out a unique name for the element to be duplicated
        const duplicateElementGuid = canvasElementGuidMap[selectedElement.guid];
        const duplicateElementName = _getUniqueDuplicateElementName(selectedElement.name, blacklistNames);
        blacklistNames.push(duplicateElementName);

        const elementConfig = getConfigForElementType(selectedElement.elementType);
        const { duplicatedElement, duplicatedChildElements = {} } =
            elementConfig &&
            elementConfig.factory &&
            elementConfig.factory.duplicateElement &&
            elementConfig.factory.duplicateElement(
                selectedElement,
                duplicateElementGuid,
                duplicateElementName,
                childElementGuidMap,
                childElementNameMap
            );

        newState[duplicatedElement.guid] = duplicatedElement;
        newState = { ...newState, ...duplicatedChildElements };
    }

    // Update the available connections and connector count on each duplicated element based on what connectors were also duplicated
    _updateAvailableConnectionsAndConnectorCount(
        newState,
        connectorsToDuplicate,
        canvasElementGuidMap,
        childElementGuidMap
    );

    return newState;
}

/**
 * Helper function to deselect an element
 *
 * @param {Object} selectedElement - a canvas element that's selected
 * @param {Object} state to update - the state
 *
 * @private
 */
function _deselectElement(selectedElement, state) {
    if (selectedElement && selectedElement.config && selectedElement.config.isSelected) {
        state[selectedElement.guid] = Object.assign({}, selectedElement, {
            config: {
                isSelected: false,
                isHighlighted: selectedElement.config.isHighlighted
            }
        });
    }
}

/**
 * Helper function to add or update a decision/wait element
 *
 * @param {Object} state - current state of elements in the store
 * @param {Object} canvasElement - the canvas element being added/modified
 * @param {Object[]} deletedChildElementGuids - Guids of all child elements being deleted. If deleted child elements have associated connectors, then
 * the connectorCount will be decremented appropriately
 * @param {Object[]} childElements - All child elements in the updated canvas element state (does not include deleted child elements)
 *
 * @return {Object} new state after reduction
 * @private
 */
function _addOrUpdateCanvasElementWithChildElements(
    state,
    canvasElement,
    deletedChildElementGuids,
    childElements = []
) {
    let newState = updateProperties(state);
    newState[canvasElement.guid] = updateProperties(newState[canvasElement.guid], canvasElement);

    for (const childElement of childElements) {
        newState[childElement.guid] = updateProperties(newState[childElement.guid], childElement);
    }

    newState = omit(newState, deletedChildElementGuids);

    return newState;
}

/**
 * Helper function to add a child element.  Will create and add the element
 * to its parent as needed
 *
 * @private
 */
function _addChildElement(state: StoreState, parentGuid: Guid, childElement: ChildElement): object {
    const newState = updateProperties(state);

    newState[childElement.guid] = updateProperties(newState[childElement.guid], childElement);

    let parentElement: CanvasElement = newState[parentGuid];
    parentElement = updateProperties(parentElement, {
        childReferences: [
            ...parentElement.childReferences,
            {
                childReference: childElement.guid
            }
        ]
    });

    newState[parentGuid] = updateProperties(newState[parentGuid], parentElement);

    return newState;
}

/**
 * Helper function to add or update an element.
 *
 * @param {Object} state - current state of elements in the store
 * @param {String} guid - GUID of element to be added or updated
 * @param {Object} element - information about the element to be added or updated
 * @return {Object} new state after reduction
 * @private
 */
function _addOrUpdateElement(state, guid, element) {
    const newState = updateProperties(state);
    newState[guid] = updateProperties(newState[guid], element);
    return newState;
}

/**
 * Helper function to update the locations off all the dragged canvas elements
 *
 * @param {Object} state - current state of elements in the store
 * @param {Object[]} updatedCanvasElementLocations - Array of objects containing updated canvas elements locations
 * @returns {Object} new state after reduction
 * @private
 */
function _updateCanvasElementsLocation(state, updatedCanvasElementLocations) {
    const newState = updateProperties(state);
    updatedCanvasElementLocations.map((info) => {
        newState[info.canvasElementGuid] = updateProperties(newState[info.canvasElementGuid], {
            locationX: info.locationX,
            locationY: info.locationY
        });
        return info;
    });

    return newState;
}

/**
 * Helper function to replace an element.  This will completely replace the element in the store with the provided.
 * Currently used only by variable and constant
 *
 * @param {Object} state - current state of elements in the store
 * @param {String} guid - GUID of element to be replaced
 * @param {Object} element - The element to inject
 * @return {Object} new state after reduction
 * @private
 */
function _updateVariableOrConstant(state, guid, element) {
    return updateProperties(state, { [guid]: element });
}

/**
 * Helper function update an element a record lookup.
 * It should be deleted when W-5147341 is fixed
 * @param {Object} state - current state of elements in the store
 * @param {String} guid - GUID of element to be added or updated
 * @param {Object} element - information about the element to be added or updated
 * @return {Object} new state after reduction
 * @private
 */
function _updateRecordLookup(state, guid, element) {
    const newState = _addOrUpdateElement(state, guid, element);
    // remove shortOrder and sortField if they are not in element
    if (element.hasOwnProperty('object')) {
        if (!element.hasOwnProperty('sortOrder')) {
            delete newState[guid].sortOrder;
        }
        if (!element.hasOwnProperty('sortField')) {
            delete newState[guid].sortField;
        }
    }
    return newState;
}

/**
 * Helper function to delete all selected canvas elements and to update the affected canvas elements with the new connector count
 *
 * @param {Object} elements - current state of elements in the store
 * @param {String[]} originalGUIDs - GUIDs of canvas elements that need to be deleted
 * @param {Object[]} connectorsToDelete - All connector objects that need to be deleted
 * @returns {Object} new state after reduction
 * @private
 */
function _deleteAndUpdateElements(elements, originalElements, connectorsToDelete) {
    const guidsToDelete = [];

    originalElements.forEach((element) => {
        guidsToDelete.push(...getSubElementGuids(element, elements));
        guidsToDelete.push(element.guid);
    });

    const newState = omit(elements, guidsToDelete);

    const connectorsToDeleteLength = connectorsToDelete.length;
    for (let i = 0; i < connectorsToDeleteLength; i++) {
        const connector = connectorsToDelete[i];
        const connectorSourceElement = updateProperties(newState[connector.source]);
        if (connectorSourceElement && connectorSourceElement.connectorCount) {
            // Decrements the connector count
            connectorSourceElement.connectorCount--;

            if (connectorSourceElement.availableConnections) {
                // Adds the deleted connector to availableConnections
                connectorSourceElement.availableConnections = addItem(connectorSourceElement.availableConnections, {
                    type: connector.type,
                    childReference: connector.childSource
                });
            }

            newState[connector.source] = connectorSourceElement;
        }
    }

    return newState;
}

/**
 * Helper function to increment the connector count of a given canvas element when a new connection has been added
 *
 * @param {Object} elements - current state of elements in the store
 * @param {String} connector - connector object
 * @returns {Object} new state after reduction
 * @private
 */
function _updateElementOnAddConnection(elements, connector) {
    const newState = updateProperties(elements);
    const sourceGuid = connector.source;
    const sourceElement = updateProperties(newState[sourceGuid]);

    // Filters out the available connections on the source element for the given connector
    const childSourceGUID = connector.childSource;
    const connectorType = connector.type;
    _filterAvailableConnections(sourceElement, childSourceGUID, connectorType);

    // Increments the connector count
    sourceElement.connectorCount++;
    newState[connector.source] = sourceElement;

    return newState;
}

/**
 * Helper function to select a canvas element. Iterates over all the canvas elements and sets the isSelected property for
 * the selected canvas element to true (Doesn't affect it's isHighlighted state). Also sets the isSelected and
 * isHighlighted property for all other selected/highlighted canvas elements to false.
 *
 * @param {Object} elements - current state of elements in the store
 * @param {String} selectedGUID - GUID of the canvas element to be selected
 * @return {Object} new state of elements after reduction
 * @private
 */
function _selectCanvasElement(elements, selectedGUID) {
    const newState = updateProperties(elements);
    let hasStateChanged = false;
    Object.keys(elements).map((guid) => {
        const element = newState[guid];
        if (element && element.isCanvasElement && element.config) {
            if (guid === selectedGUID) {
                if (!element.config.isSelected) {
                    newState[guid] = updateProperties(element, {
                        config: {
                            isSelected: true,
                            isHighlighted: element.config.isHighlighted
                        }
                    });
                    hasStateChanged = true;
                }
            } else if (element.config.isSelected || element.config.isHighlighted) {
                newState[guid] = updateProperties(element, {
                    config: {
                        isSelected: false,
                        isHighlighted: false
                    }
                });
                hasStateChanged = true;
            }
        }
        return guid;
    });
    return hasStateChanged ? newState : elements;
}

/**
 * Helper function to marquee select canvas elements. Iterates over the guidsToSelect/guidsToDeselect array
 * and sets the isSelected property of the canvas element to true/false repectively, and set isHighlighted state to false in both case.
 *
 * @param {Object} elements - current state of elements in the store
 * @param {String[]} guidsToSelect - Array of canvas elements to be selected
 * @param {String[]} guidsToDeselect - Array of canvas elements to be deselected
 */
function _marqueeSelect(elements, guidsToSelect, guidsToDeselect) {
    const newState = updateProperties(elements);
    let hasStateChanged = false;
    guidsToSelect.map((guid) => {
        newState[guid] = updateProperties(newState[guid], {
            config: {
                isSelected: true,
                isHighlighted: newState[guid].config.isHighlighted
            }
        });
        hasStateChanged = true;
        return guid;
    });

    guidsToDeselect.map((guid) => {
        newState[guid] = updateProperties(newState[guid], {
            config: {
                isSelected: false,
                isHighlighted: newState[guid].config.isHighlighted
            }
        });
        hasStateChanged = true;
        return guid;
    });

    return hasStateChanged ? newState : elements;
}

/**
 * Helper function to toggle the isSelected state of a canvas element. This doesn't affect the isHighlighted state.
 *
 * @param {Object} elements - current state of elements in the store
 * @param {String} selectedGUID - GUID of the canvas element to be toggled
 * @return {Object} new state of elements after reduction
 * @private
 */
function _toggleCanvasElement(elements, selectedGUID) {
    const newState = updateProperties(elements);
    const element = elements[selectedGUID];
    if (element) {
        newState[selectedGUID] = updateProperties(newState[selectedGUID], {
            config: {
                isSelected: !element.config.isSelected,
                isHighlighted: element.config.isHighlighted
            }
        });
    }
    return newState;
}

/**
 * Iterates over all the canvas elements and sets the isSelected and isHighlighted property of all the currently
 * selected/highlighted canvas elements to false.
 *
 * @param {Object} elements - current state of elements in the store
 * @return {Object} new state of elements after reduction
 * @private
 */
function _deselectCanvasElements(elements) {
    const newState = updateProperties(elements);
    let hasStateChanged = false;
    Object.keys(elements).map((guid) => {
        const element = newState[guid];
        if (
            element &&
            element.isCanvasElement &&
            element.config &&
            (element.config.isSelected || element.config.isHighlighted)
        ) {
            newState[guid] = updateProperties(element, {
                config: {
                    isSelected: false,
                    isHighlighted: false
                }
            });
            hasStateChanged = true;
        }
        return guid;
    });
    return hasStateChanged ? newState : elements;
}

/**
 * Sets the isHighlighted property of the searched element to true (if it already wasn't). Also sets the isHighlighted
 * property of any other highlighted canvas element to false. This doesn't affect the isSelected property of any element.
 *
 * @param {Object} elements - current state of elements in the store
 * @param {String} elementGuid - GUID of the canvas element to be highlighted
 * @returns {Object} new state of elements after reduction
 * @private
 */
function _highlightCanvasElement(elements, elementGuid) {
    const newState = updateProperties(elements);
    Object.keys(elements).map((guid) => {
        const element = newState[guid];
        if (element && element.isCanvasElement && element.config) {
            if (guid === elementGuid) {
                if (!element.config.isHighlighted) {
                    newState[guid] = updateProperties(element, {
                        config: {
                            isSelected: element.config.isSelected,
                            isHighlighted: true
                        }
                    });
                }
            } else if (element.config.isHighlighted) {
                newState[guid] = updateProperties(element, {
                    config: {
                        isSelected: element.config.isSelected,
                        isHighlighted: false
                    }
                });
            }
        }
        return guid;
    });
    return newState;
}

/**
 * Helper function to add or update a screenFields
 *
 * @param {Object} state - current state of elements in the store
 * @param {Object} screen - the screen being added/modified
 * @param {Object[]} deletedFields - All screenFields being deleted.
 * @param {Object[]} fields - All screenFields in the updated screen state (does not include deleted screenFields)
 *
 * @return {Object} new state after reduction
 * @private
 */
function _addOrUpdateScreenWithScreenFields(state, screen, deletedFields, fields = []) {
    let newState = updateProperties(state);
    newState[screen.guid] = updateProperties(newState[screen.guid], screen);

    for (const field of fields) {
        newState[field.guid] = updateProperties(newState[field.guid], field);
    }

    const deletedFieldGuids = [];
    for (const field of deletedFields) {
        deletedFieldGuids.push(field.guid);
    }

    newState[screen.guid] = updateProperties(newState[screen.guid]);
    newState = omit(newState, deletedFieldGuids);
    return newState;
}

/**
 * Helper function to get unique dev name that is not in the store or in the passed in blacklist
 *
 * @param {String} name - existing dev name to make unique
 * @param {String[]} blacklistNames - blacklisted list of names to check against in addition to store
 *
 * @return {String} new unique dev name
 */
function _getUniqueDuplicateElementName(name, blacklistNames = []) {
    if (isDevNameInStore(name) || blacklistNames.includes(name)) {
        return _getUniqueDuplicateElementName(name + '_0', blacklistNames);
    }

    return name;
}

/**
 * Helper function to get unique dev names for child elements
 *
 * @param {Object} state - store state
 * @param {Object} childElementGuidsToDuplicate - list of guids of the child elements to duplicate
 * @param {String[]} blacklistNames - blacklisted list of names to check against in addition to store
 *
 * @return {Object} Map of child element dev names to duplicated child element dev names
 */
function _getDuplicateChildElementNameMap(state, childElementGuidsToDuplicate, blacklistNames = []) {
    const childElementNameMap = {};
    for (let i = 0; i < childElementGuidsToDuplicate.length; i++) {
        const childElement = state[childElementGuidsToDuplicate[i]];
        const duplicateChildElementName = _getUniqueDuplicateElementName(childElement.name, blacklistNames);
        childElementNameMap[childElement.name] = duplicateChildElementName;
        blacklistNames.push(duplicateChildElementName);
    }

    return childElementNameMap;
}

/**
 * Helper function to update available connections and connector count for duplicated elements
 *
 * @param {Object} state - store state
 * @param {Object[]} connectorsToDuplicate - list of connector objects to duplicate
 * @param {Object} canvasElementGuidMap - Map of canvas element guids to duplicated canvas element guids
 * @param {Object} childElementGuidMap - Map of child element guids to duplicated child element guids
 */
function _updateAvailableConnectionsAndConnectorCount(
    state,
    connectorsToDuplicate,
    canvasElementGuidMap,
    childElementGuidMap
) {
    for (let i = 0; i < connectorsToDuplicate.length; i++) {
        const originalConnector = connectorsToDuplicate[i];

        const duplicateSourceGuid = canvasElementGuidMap[originalConnector.source];
        const duplicateSourceElement = state[duplicateSourceGuid];

        const childSourceGUID = originalConnector.childSource && childElementGuidMap[originalConnector.childSource];
        const duplicateConnectorType = originalConnector.type;
        _filterAvailableConnections(duplicateSourceElement, childSourceGUID, duplicateConnectorType);

        state[duplicateSourceGuid] = Object.assign({}, duplicateSourceElement, {
            connectorCount: duplicateSourceElement.connectorCount + 1
        });
    }
}

/**
 * Helper function to filter available connections on an element based on connector type or child source guid
 *
 * @param {Object} element - canvas element for which available connections are to be filtered
 * @param {String} childSourceGUID - child source guid (eg. outcome guid) to filter available connections on
 * @param {String} connectorType - connector type to filter available connections on
 */
function _filterAvailableConnections(element, childSourceGUID, connectorType) {
    // Filter out an available connection if the child reference matches the child source element guid passed in OR if the connector type matches the connector type passed in
    if (element.availableConnections) {
        if (childSourceGUID) {
            element.availableConnections = element.availableConnections.filter(
                (availableConnector) => availableConnector.childReference !== childSourceGUID
            );
        } else {
            element.availableConnections = element.availableConnections.filter(
                (availableConnector) => availableConnector.type !== connectorType
            );
        }
    }
}
