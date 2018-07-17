import { Element, api } from 'engine';
import { PropertyChangedEvent } from 'builder_platform_interaction-events';
import { LABELS } from 'builder_platform_interaction-screen-editor-i18n-utils';
import { INPUT_FIELD_DATA_TYPE } from 'builder_platform_interaction-data-type-lib';
import { getValueFromHydratedItem } from 'builder_platform_interaction-data-mutation-lib';

/*
 * Screen element property editor for input fields.
 */
export default class ScreenInputFieldPropertiesEditor extends Element {
    @api field;
    @api isNewMode = false;

    labels = LABELS;

    /* Figure out if the value really changed, and if it did refire the event including the old value */
    handlePropertyChanged = (event) => {
        const property = event.detail.propertyName;
        const newValue = event.detail.value;
        const error = event.detail.error;
        const currentValue = property && this.field[property] && this.field[property].value;
        if (currentValue !== newValue) {
            this.dispatchEvent(new PropertyChangedEvent(property, newValue, error, this.field.guid, this.field[property]));
        }
        event.stopPropagation();
    }

    /* Handle change of Label combobox */
    handleInputLabelChanged(event) {
        event.detail.propertyName = 'fieldText';
        event.detail.value = event.detail.displayText;
        this.handlePropertyChanged(event);
        event.stopPropagation();
    }

    /* Handle change of Default Value combobox */
    handleDefaultValueChanged(event) {
        event.detail.propertyName = 'defaultValue';
        event.detail.value = event.detail.displayText;
        this.handlePropertyChanged(event);
        event.stopPropagation();
    }

    /* Figure out if the value really changed, and if it did refire the event including the old value */
    handleErrorMessageChanged = (event) => {
        const validationProp = 'validationRule';
        const property = event.detail.propertyName;
        const newValue = event.detail.value;
        const error = event.detail.error;
        const currentValue = property && this.field[validationProp] && this.field[validationProp].errorMessage && this.field[validationProp].errorMessage.value;
        if (currentValue !== newValue) {
            this.dispatchEvent(new PropertyChangedEvent(property, newValue, error, this.field.guid, this.field[validationProp].errorMessage));
        }
        event.stopPropagation();
    }

    handleFetchMenuData(event) {
        event.stopPropagation();
        // TODO: fetch menu data
    }

    get fieldLabel() {
        return this.field.fieldText ? this.field.fieldText.value : null;
    }

    get dataTypeList() {
        return Object.values(INPUT_FIELD_DATA_TYPE);
    }

    get dataTypePickerValue() {
        return  {
            dataType : getValueFromHydratedItem(this.field.type.name),
            scale : null,
            isCollection : false
        };
    }

    get isScaleEnabled() {
        const fieldType = getValueFromHydratedItem(this.field.type.name);
        return fieldType === 'Number' || fieldType === 'Currency';
    }

    get validationRuleError() {
        return this.field.validationRule ? this.field.validationRule.errorMessage : null;
    }

    get validationRuleFormula() {
        return this.field.validationRule ? this.field.validationRule.formulaExpression : null;
    }

    /**
     * Indicates if the field's subtype property should be editable or not.
     */
    get isSubTypeDisabled() {
        return !this.isNewMode;
    }
}