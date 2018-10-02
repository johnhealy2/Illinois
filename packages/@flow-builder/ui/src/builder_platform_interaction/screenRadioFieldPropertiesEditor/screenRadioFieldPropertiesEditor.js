import { LightningElement, api } from 'lwc';
import { PropertyChangedEvent, createChoiceAddedEvent, createChoiceChangedEvent, createChoiceDeletedEvent } from "builder_platform_interaction/events";
import { LABELS } from "builder_platform_interaction/screenEditorI18nUtils";
import { ELEMENT_TYPE } from "builder_platform_interaction/flowMetadata";
import { INPUT_FIELD_DATA_TYPE } from "builder_platform_interaction/dataTypeLib";
import {  getFieldChoiceData } from "builder_platform_interaction/screenEditorUtils";
import { addCurrentValueToEvent } from "builder_platform_interaction/screenEditorCommonUtils";
import { getElementByGuid } from "builder_platform_interaction/storeUtils";
import { hydrateIfNecessary } from "builder_platform_interaction/dataMutationLib";
const ALL_SECTION_NAMES = ['choice', 'helpText'];
const FLOW_INPUT_FIELD_SUB_TYPES = Object.values(INPUT_FIELD_DATA_TYPE);
const CHOICE_FRP_CONFIG = {
    allowLiterals: false,
    collection: false,
    elementType: ELEMENT_TYPE.SCREEN // TODO this needs to be changed to CHOICE once Choice selector is added
};

/*
 * Screen element property editor for the radio field.
 */
export default class ScreenRadioFieldPropertiesEditor extends LightningElement {
    @api field;

    labels = LABELS;
    inputFieldMap = INPUT_FIELD_DATA_TYPE;

    get allSectionNames() {
        return ALL_SECTION_NAMES;
    }

    handlePropertyChanged = (event) => {
        this.dispatchEvent(addCurrentValueToEvent(event, this.field, this.field[event.detail.propertyName]));
        event.stopPropagation();
    }

    handleDataTypeChanged(event) {
        event.stopPropagation();
        const newFieldDataType = this.getFlowDataTypeFromInputType(event.detail.value.dataType);
        this.dispatchEvent(new PropertyChangedEvent("dataType", newFieldDataType, event.detail.error, this.field.guid, this.field.dataType));
    }

    handleDefaultValuePropertyChanged = (event) => {
        event.stopPropagation();

        // We get the display value from the event, which might be something
        // like {!choice1}, but we want the devName. Get the devName by using the GUID.
        const element = getElementByGuid(event.detail.guid);
        if (!element) {
            throw new Error("Cannot find element for newly selected default value");
        }

        this.dispatchEvent(new PropertyChangedEvent(
            event.detail.propertyName,
            hydrateIfNecessary(element.name),
            event.detail.error,
            this.field.guid,
            hydrateIfNecessary(this.field.defaultValue)
        ));
    }

    handleChoiceChanged = (event) => {
        event.stopPropagation();

        // We get the display value from the event, which might be something
        // like {!choice1}, but we want the devName. Get the devName by using the GUID.
        const element = getElementByGuid(event.detail.guid);
        if (!element) {
            throw new Error("Cannot find element for newly selected choice");
        }
        this.dispatchEvent(createChoiceChangedEvent(this.field, {value: element.name, error: event.detail.error}, event.detail.listIndex));
    }

    handleChoiceDeleted = (event) => {
        event.stopPropagation();
        this.dispatchEvent(createChoiceDeletedEvent(this.field, event.detail.index));
    }

    handleChoiceAdded = (event) => {
        event.stopPropagation();
        this.dispatchEvent(createChoiceAddedEvent(this.field, this.field.choiceReferences.length));
    }

    get fieldChoices() {
        return getFieldChoiceData(this.field);
    }

    get choiceResourcePickerConfig() {
        return CHOICE_FRP_CONFIG;
    }

    get isFieldDisabled() {
        // Left like this for testing during development
        return !this.field.isNewField;
    }

    get dataTypePickerValue() {
        return this.field.dataType ? this.getInputTypeFromFieldDataType : undefined;
    }

    get dataTypeList() {
        return FLOW_INPUT_FIELD_SUB_TYPES;
    }

    get showDelete() {
        return this.field.choiceReferences.length > 1;
    }

    // Convert the value selected from the data type drop down menu to the corresponding flow data type.
    get getInputTypeFromFieldDataType() {
        for (const key in this.inputFieldMap) {
            if (this.field.dataType === key) {
                return { dataType : this.inputFieldMap[key].value };
            }
        }
        throw new Error("Screen field data type is set, but unable to find corresponding flow data type: " + this.field.dataType);
    }

    // Convert flow data type to the value from the data type drop down list.
    getFlowDataTypeFromInputType(newValue) {
        for (const key in this.inputFieldMap) {
            if (this.inputFieldMap[key].value === newValue) {
                return key;
            }
        }
        throw new Error("Unable to find Flow data type for provided screen field input type: " + newValue);
    }
}