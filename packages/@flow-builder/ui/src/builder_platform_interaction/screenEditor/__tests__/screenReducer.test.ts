// @ts-nocheck
import {
    createTestScreen,
    createTestScreenField,
    createTestScreenWithFields
} from 'builder_platform_interaction/builderTestUtils';
import { screenReducer } from '../screenReducer';

import {
    PropertyChangedEvent,
    createScreenElementMovedEvent,
    createScreenElementDeletedEvent,
    createAddScreenFieldEvent,
    UseAdvancedOptionsSelectionChangedEvent,
    DynamicTypeMappingChangeEvent
} from 'builder_platform_interaction/events';

import { getCachedExtension } from 'builder_platform_interaction/flowExtensionLib';
import { Store } from 'builder_platform_interaction/storeLib';
import { flowWithAllElementsUIModel } from 'mock/storeData';

const section1Guid = 'section1';
const column1Guid = 'column1';
const column2Guid = 'column2';

jest.mock('builder_platform_interaction/storeLib', () => require('builder_platform_interaction_mocks/storeLib'));

jest.mock('builder_platform_interaction/flowExtensionLib', () => {
    const flowExtensionLib = jest.requireActual('builder_platform_interaction/flowExtensionLib');
    return Object.assign({}, flowExtensionLib, {
        getCachedExtension: jest.fn().mockReturnValue({
            inputParameters: [
                {
                    apiName: 'param1',
                    dataType: 'sobject',
                    subtype: '{abc}'
                },
                {
                    apiName: 'param2',
                    dataType: 'string'
                }
            ],
            outputParameters: []
        })
    });
});

const SCREEN_NAME = 'TestScreen1';

describe('screen reducer', () => {
    beforeAll(() => {
        Store.setMockState(flowWithAllElementsUIModel);
    });
    afterAll(() => {
        Store.resetStore();
    });
    it('updates the label', () => {
        const event = {
            type: PropertyChangedEvent.EVENT_NAME,
            detail: {
                propertyName: 'label',
                value: { value: 'newlabel', error: null },
                error: null
            }
        };
        const screen = createTestScreen(SCREEN_NAME);
        const newScreen = screenReducer(screen, event, screen);
        expect(newScreen).toBeDefined();
        expect(newScreen.label.value).toEqual('newlabel');
        expect(newScreen).not.toBe(screen);
    });

    it('change screen field property', () => {
        const newDisplayText = 'new display text';
        const screen = createTestScreen(SCREEN_NAME, ['displayText']);
        const event = {
            type: PropertyChangedEvent.EVENT_NAME,
            detail: {
                propertyName: 'fieldText',
                value: { value: newDisplayText, error: null },
                error: null,
                guid: screen.fields[0].guid,
                oldValue: screen.fields[0].fieldText
            }
        };
        const newScreen = screenReducer(screen, event, screen.fields[0]);

        // The changed property should be updated, but the unchanged property should be the same.
        expect(newScreen).toBeDefined();
        expect(newScreen.fields[0].fieldText.value).toBe(newDisplayText);
        expect(newScreen.fields[0].name.value).toBe(screen.fields[0].name.value);
    });

    it('change a property of a field within a container field', () => {
        const newDisplayText = 'new display text';
        const screen = createTestScreen(SCREEN_NAME, ['displayText']);
        const field1 = screen.fields.pop();
        const section = {
            guid: section1Guid,
            name: section1Guid,
            fields: [
                {
                    guid: column1Guid,
                    name: column1Guid,
                    fields: [field1]
                }
            ]
        };
        screen.fields.push(section);
        const event = {
            type: PropertyChangedEvent.EVENT_NAME,
            detail: {
                propertyName: 'fieldText',
                value: { value: newDisplayText, error: null },
                error: null,
                guid: field1.guid,
                oldValue: field1.fieldText
            }
        };
        const newScreen = screenReducer(screen, event, field1);
        const newField = newScreen.fields[0].fields[0].fields[0];
        expect(newScreen).toBeDefined();
        expect(newField.fieldText.value).toBe(newDisplayText);
        expect(newField.name.value).toBe(field1.name.value);
    });
    it('change screen field validation error message when there is none before', () => {
        const newErrorMessage = 'error1';
        const screen = createTestScreen(SCREEN_NAME, ['displayText']);
        const event = {
            type: PropertyChangedEvent.EVENT_NAME,
            detail: {
                propertyName: 'errorMessage',
                value: { value: newErrorMessage, error: null },
                error: null,
                guid: screen.fields[0].guid,
                oldValue: undefined
            }
        };
        const newScreen = screenReducer(screen, event, screen.fields[0]);

        // The changed property should be updated and not hydrated since it wasn't set before.
        expect(newScreen).toBeDefined();
        expect(newScreen.fields[0].errorMessage.value).toBe(newErrorMessage);
    });

    it('change screen field validation error message when field has one set already', () => {
        // Field and screen setup
        const oldErrorMessage = 'error1';
        const newErrorMessage = 'error2';
        const screen = createTestScreen(SCREEN_NAME, null);
        screen.fields = [];
        const field = createTestScreenField('Screenfield1', 'DisplayText', 'Display this');
        field.errorMessage = { value: oldErrorMessage, error: null };
        field.formulaExpression = {
            value: '{Screenfield1} != null',
            error: null
        };
        screen.fields.push(field);

        const event = {
            type: PropertyChangedEvent.EVENT_NAME,
            detail: {
                propertyName: 'errorMessage',
                value: { value: newErrorMessage, error: null },
                error: null,
                guid: screen.fields[0].guid,
                oldValue: screen.fields[0].errorMessage
            }
        };
        const newScreen = screenReducer(screen, event, screen.fields[0]);

        // The changed property should be updated and hydrated since it was hydrated before.
        expect(newScreen).toBeDefined();
        expect(newScreen.fields[0].errorMessage.value).toBe(newErrorMessage);
    });

    it('change screen field validation rule formula expression when there is none before', () => {
        const newFormula = '{Screenfield1} != null';
        const screen = createTestScreen(SCREEN_NAME, ['displayText']);
        const event = {
            type: PropertyChangedEvent.EVENT_NAME,
            detail: {
                propertyName: 'formulaExpression',
                value: { value: newFormula, error: null },
                error: null,
                guid: screen.fields[0].guid,
                oldValue: undefined
            }
        };
        const newScreen = screenReducer(screen, event, screen.fields[0]);

        // The changed property should be updated and not hydrated since it wasn't set before.
        expect(newScreen).toBeDefined();
        expect(newScreen.fields[0].formulaExpression.value).toBe(newFormula);
    });

    it('change screen field validation rule formula expression when field has one set already', () => {
        // Field and screen setup
        const oldFormula = '{Screenfield1} == null';
        const newFormula = '{Screenfield1} != null';
        const screen = createTestScreen(SCREEN_NAME, null);
        screen.fields = [];
        const field = createTestScreenField('Screenfield1', 'DisplayText', 'Display this');
        field.errorMessage = { value: 'some error', error: null };
        field.formulaExpression = { value: oldFormula, error: null };
        screen.fields.push(field);

        const event = {
            type: PropertyChangedEvent.EVENT_NAME,
            detail: {
                propertyName: 'formulaExpression',
                value: { value: newFormula, error: null },
                error: null,
                guid: screen.fields[0].guid,
                oldValue: screen.fields[0].formulaExpression
            }
        };
        const newScreen = screenReducer(screen, event, screen.fields[0]);

        // The changed property should be updated and hydrated since it was hydrated before.
        expect(newScreen).toBeDefined();
        expect(newScreen.fields[0].formulaExpression.value).toBe(newFormula);
    });

    it('fetches the error from the property change event instead of rerunning validation', () => {
        const event = {
            type: PropertyChangedEvent.EVENT_NAME,
            detail: {
                propertyName: 'label',
                value: { value: 'newlabel', error: 'errorFromChildComponent' },
                error: 'errorFromChildComponent'
            }
        };
        const screen = createTestScreen(SCREEN_NAME);
        const newScreen = screenReducer(screen, event, screen);
        expect(newScreen).toBeDefined();
        expect(newScreen.label.error).toBe('errorFromChildComponent');
        expect(newScreen).not.toBe(screen);
    });

    it('ignores unknown events', () => {
        const screen = createTestScreen(SCREEN_NAME);
        const newScreen = screenReducer(screen, new Event('unknown'));
        expect(newScreen).toBeDefined();
        expect(newScreen.label.value).toBe(SCREEN_NAME);
        expect(newScreen).toBe(screen);
    });

    it('inserts a field at a specific position', () => {
        const fieldType = 'Currency';
        const screen = createTestScreen(SCREEN_NAME, null);
        const event = createAddScreenFieldEvent(fieldType, 5);
        const newScreen = screenReducer(screen, event);
        expect(newScreen.fields).toHaveLength(screen.fields.length + 1);
        expect(newScreen.fields[5].type.name).toBe(fieldType);
    });

    it('adds a field at the end of the array', () => {
        const fieldType = 'Currency';
        const screen = createTestScreen(SCREEN_NAME, null);
        const event = createAddScreenFieldEvent(fieldType);
        const newScreen = screenReducer(screen, event);
        expect(newScreen.fields).toHaveLength(screen.fields.length + 1);
        expect(newScreen.fields[newScreen.fields.length - 1].type.name).toBe(fieldType);
    });

    describe('container field', () => {
        let screen, field1, field2;
        beforeEach(() => {
            screen = createTestScreen(SCREEN_NAME, null);
            field1 = screen.fields.pop();
            field2 = screen.fields.pop();

            const section = {
                guid: section1Guid,
                name: section1Guid,
                fields: [
                    {
                        guid: column1Guid,
                        name: column1Guid,
                        type: {
                            name: 'Column'
                        },
                        inputParameters: [
                            {
                                name: 'width',
                                value: '6'
                            }
                        ],
                        fields: []
                    },
                    {
                        guid: column2Guid,
                        name: column2Guid,
                        type: {
                            name: 'Column'
                        },
                        inputParameters: [
                            {
                                name: 'width',
                                value: '6'
                            }
                        ],
                        fields: [field1, field2]
                    }
                ]
            };
            screen.fields[1] = section;
        });

        it('adds a child field', () => {
            const fieldType = 'TextBox';

            const event = createAddScreenFieldEvent(fieldType, 0, screen.fields[1].fields[1].guid);
            const newScreen = screenReducer(screen, event);
            const childFields = newScreen.fields[1].fields[1].fields;
            expect(childFields).toHaveLength(3);
            expect(childFields[0].type.name).toBe(fieldType);
        });

        it('resizes columns if column added to section', async () => {
            expect.assertions(2);

            const event = createAddScreenFieldEvent('Column', 0, screen.fields[1].guid);
            const newScreen = screenReducer(screen, event);
            const childFields = newScreen.fields[1].fields;
            expect(childFields).toHaveLength(3);
            expect(childFields[0].inputParameters[0].value).toBe(4);
        });

        it('deletes a child field', () => {
            const event = createScreenElementDeletedEvent(field1, null, screen.fields[1].fields[1].guid);
            const newScreen = screenReducer(screen, event);
            const childFields = newScreen.fields[1].fields[1].fields;
            expect(childFields).toHaveLength(1);
            expect(childFields[0].name).toEqual(field2.name);
        });

        it('resizes columns if column deleted from section', () => {
            const event = createScreenElementDeletedEvent(screen.fields[1].fields[0], null, screen.fields[1].guid);
            const newScreen = screenReducer(screen, event);
            const column = newScreen.fields[1].fields[0];
            expect(column.inputParameters[0].value).toEqual(12);
        });
    });

    it('deletes a screen field', () => {
        const screen = createTestScreen(SCREEN_NAME, null);
        const event = createScreenElementDeletedEvent(screen.fields[0]);

        const newScreen = screenReducer(screen, event);
        expect(newScreen.fields[0]).not.toBe(screen.fields[0]);
        expect(newScreen.fields).toHaveLength(screen.fields.length - 1);
    });

    it('reorders fields', () => {
        const screen = createTestScreen(SCREEN_NAME, null);
        const event = createScreenElementMovedEvent(screen.fields[0].guid, screen.guid, 3);

        const newScreen = screenReducer(screen, event);
        expect(screen.fields[0]).toBe(newScreen.fields[2]);
        expect(screen.fields[2]).toBe(newScreen.fields[1]);
        expect(newScreen.fields).toHaveLength(screen.fields.length);
    });

    it('moves a field between container fields', () => {
        const screen = createTestScreen(SCREEN_NAME, null);
        const field1 = screen.fields.pop();
        const field2 = screen.fields.pop();
        const section = {
            guid: section1Guid,
            name: section1Guid,
            fields: [
                {
                    guid: column1Guid,
                    name: column1Guid,
                    fields: [field1]
                },
                {
                    guid: column2Guid,
                    name: column2Guid,
                    fields: [field2]
                }
            ]
        };
        screen.fields[1] = section;
        const event = createScreenElementMovedEvent(field1.guid, column2Guid, 0);
        const newScreen = screenReducer(screen, event);
        const newSection = newScreen.fields[1];
        expect(newSection.fields[0].fields).toHaveLength(0);
        expect(field1).toBe(newSection.fields[1].fields[0]);
        expect(field2).toBe(newSection.fields[1].fields[1]);
        expect(newSection.fields[1].fields).toHaveLength(2);
    });

    it('reorders fields when dest and source are the same results in no change', () => {
        const screen = createTestScreen(SCREEN_NAME, null);
        const event = createScreenElementMovedEvent(screen.fields[0].guid, screen.guid, 0);
        const newScreen = screenReducer(screen, event);
        expect(newScreen.fields).toEqual(screen.fields);
    });

    it('invalid index for destination results in no change', () => {
        const screen = createTestScreen(SCREEN_NAME, null);
        const event = createScreenElementMovedEvent(screen.fields[0].guid, screen.guid, -1);
        const newScreen = screenReducer(screen, event);
        expect(newScreen.fields).toEqual(screen.fields);
    });

    it('invalid guid for source field results in no change', () => {
        const screen = createTestScreen(SCREEN_NAME, null);
        const event = createScreenElementMovedEvent(screen.guid, screen.fields[0].guid, 0);
        const newScreen = screenReducer(screen, event);
        expect(newScreen.fields).toEqual(screen.fields);
    });
    describe('on UseAdvancedOptionsSelectionChanged', () => {
        it('updates screen field with expected option', () => {
            const expectedEvent = new UseAdvancedOptionsSelectionChangedEvent(true);
            const field = createTestScreenField('fieldName', 'Extension', 'fieldValue', {}, true);
            const screen = createTestScreenWithFields('screenName', [field], {});

            const updatedScreen = screenReducer(screen, expectedEvent, field);

            expect(updatedScreen.fields[0].storeOutputAutomatically).toBe(false);
        });
    });

    describe('dynamic type mappings', () => {
        it('updates dynamic type mapping and clears relevant extension parameters', () => {
            const screen = createTestScreen(SCREEN_NAME, null);
            const dynamicTypeMappings = [
                {
                    typeName: 'abc',
                    typeValue: {
                        value: 'type value 1',
                        error: null
                    }
                }
            ];
            const field = {
                ...screen.fields[0],
                extensionName: 'c:lookup',
                dynamicTypeMappings,
                inputParameters: [
                    {
                        name: 'param1',
                        value: 'value 1'
                    },
                    {
                        name: 'param2',
                        value: 'value 2'
                    }
                ]
            };
            const event = {
                type: DynamicTypeMappingChangeEvent.EVENT_NAME,
                detail: {
                    typeName: 'abc',
                    typeValue: 'type value 2',
                    error: null,
                    rowIndex: 'index1'
                }
            };
            const newScreen = screenReducer(screen, event, field);
            const newField = newScreen.fields[0];
            expect(newField.dynamicTypeMappings).toMatchObject([
                {
                    typeName: 'abc',
                    typeValue: {
                        value: 'type value 2',
                        error: null
                    }
                }
            ]);
            expect(newField.inputParameters).toMatchObject([
                {
                    name: 'param1',
                    value: {
                        value: '',
                        error: null
                    }
                },
                {
                    name: 'param2',
                    value: 'value 2'
                }
            ]);
            expect(getCachedExtension).toBeCalledWith(field.extensionName);
        });
    });
});