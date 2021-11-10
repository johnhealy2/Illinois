import { LightningElement, api } from 'lwc';
import { hydrateWithErrors, getErrorsFromHydratedElement } from 'builder_platform_interaction/dataMutationLib';
import { isObject, isReference } from 'builder_platform_interaction/commonUtils';
import { FEROV_DATA_TYPE } from 'builder_platform_interaction/dataTypeLib';
import { LABELS } from 'builder_platform_interaction/screenEditorI18nUtils';
import { normalizeFEROV } from 'builder_platform_interaction/expressionUtils';
import { FlowScreenFieldType } from 'builder_platform_interaction/flowMetadata';
import {
    isExtensionField,
    isNumberField,
    isDateField,
    isDateTimeField,
    isCurrencyField,
    isChoiceField,
    getPlaceHolderLabel,
    ScreenFieldName
} from 'builder_platform_interaction/screenEditorUtils';

/*
 * The screen field element that will decide the actual component to use for preview based on the field type
 */
export default class ScreenField extends LightningElement {
    @api screenfield;
    @api selectedItemGuid;
    @api movedItemGuid; // guid of the component being reordered

    labels = LABELS;

    get calculatedClass() {
        let classString = '';
        if (!this.isExtension && !this.hasErrors) {
            classString = this.isSectionType
                ? 'slds-p-vertical_medium'
                : 'slds-p-vertical_x-small slds-p-horizontal_small';
        }
        return classString;
    }

    get hasErrors(): boolean {
        const errors = this.screenfield && getErrorsFromHydratedElement(this.screenfield);
        return this.screenfield.hasErrors === true || (errors && errors.length > 0 && !this.isSectionType);
    }

    get isExtension(): boolean {
        return isExtensionField(this.screenfield.type);
    }

    get isInputFieldType() {
        return (
            this.screenfield.type.fieldType === FlowScreenFieldType.InputField ||
            this.screenfield.type.fieldType === FlowScreenFieldType.PasswordField ||
            (this.isObjectProvided() && !this.isTextAreaType && !this.isDropdownType()) // For 236, automatic field of picklist type has no preview
        );
    }

    get isChoiceField(): boolean {
        return isChoiceField(this.screenfield);
    }

    get isTextAreaType() {
        return this.screenfield.type.name === ScreenFieldName.LargeTextArea;
    }

    get isDisplayTextType() {
        return this.screenfield.type.fieldType === FlowScreenFieldType.DisplayText;
    }

    get isSectionType() {
        return this.screenfield.type.name === ScreenFieldName.Section;
    }

    get isRequired(): boolean {
        // There is no concept of required for a checkbox.
        return this.screenfield.type.name === ScreenFieldName.Checkbox ? false : this.screenfield.isRequired;
    }

    get name(): string {
        return this.screenfield && this.screenfield.name ? this.screenfield.name.value : '';
    }

    get displayName(): string {
        return this.screenfield.type.label !== null ? this.screenfield.type.label : this.screenfield.type.name;
    }

    get fieldText() {
        // The LWC components used to render these screen fields require a value for this property. however Flow doesn't require this.
        // If the user didn't provide a label, use a placeholder label for preview.
        if (this.screenfield && this.screenfield.fieldText && this.screenfield.fieldText.value !== null) {
            return this.screenfield.fieldText;
        }
        return hydrateWithErrors(getPlaceHolderLabel(this.screenfield.type.name));
    }

    get defaultValue() {
        let defaultValue =
            this.screenfield.defaultValue && this.screenfield.defaultValue.hasOwnProperty('value')
                ? this.screenfield.defaultValue.value
                : this.screenfield.defaultValue;

        const shouldNotPreviewFERs =
            isCurrencyField(this.screenfield) ||
            isNumberField(this.screenfield) ||
            isDateField(this.screenfield) ||
            isDateTimeField(this.screenfield);

        if (this.screenfield.defaultValueDataType === FEROV_DATA_TYPE.REFERENCE && shouldNotPreviewFERs) {
            defaultValue = '';
        } else if (!isReference(defaultValue)) {
            const normalizedValue = normalizeFEROV(defaultValue).itemOrDisplayText;
            defaultValue = isObject(normalizedValue)
                ? (normalizedValue as UI.ComboboxItem).displayText
                : normalizedValue;
        }

        return defaultValue;
    }

    @api focusChildElement(index) {
        const section = this.template.querySelector('builder_platform_interaction-screen-section-field');
        section.focusChildElement(index);
    }

    /**
     * Whether or not the current field type is an ObjectProvided one, aka "automatic field"
     * of picklist type
     *
     * @returns true if the current field type is an ObjectProvided one, aka "automatic field" of
     * picklist type, otherwise false
     */
    get isAutomaticFieldPicklist() {
        return this.isObjectProvided() && this.isDropdownType();
    }
    /**
     * Whether or not the current field is an ObjectProvided one, aka "automatic field"
     *
     * @returns true if the current field is an ObjectProvided one, otherwise false
     */
    private isObjectProvided() {
        return this.screenfield.type.fieldType === FlowScreenFieldType.ObjectProvided;
    }

    /**
     * Whether or not the current field type is of dropdown type
     *
     * @returns true if the current field type is dropdown type, otherwise false
     */
    private isDropdownType() {
        return this.screenfield?.type?.name === FlowScreenFieldType.DropdownBox;
    }
}
