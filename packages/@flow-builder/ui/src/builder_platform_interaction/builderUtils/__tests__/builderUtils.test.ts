// @ts-nocheck
import { getPropertyEditorConfig, showPopover, isPopoverOpen, createConfigurationEditor } from '../builderUtils';
import { ELEMENT_TYPE } from 'builder_platform_interaction/flowMetadata';

const mockPackage = 'foo';
const mockComponent = 'bar';

jest.mock('builder_platform_interaction/elementConfig', () => {
    const actual = jest.requireActual('builder_platform_interaction/elementConfig');

    return Object.assign({}, actual, {
        getConfigForElementType: jest.fn((type) => {
            const config = actual.getConfigForElementType(type);
            config.descriptor = `${mockPackage}:${mockComponent}`;
            return config;
        }),
        getConfigForElement: jest.fn((element) => {
            const config = actual.getConfigForElement(element);
            config.descriptor = `${mockPackage}:${mockComponent}`;
            return config;
        })
    });
});

jest.mock('aura', () => {
    return {
        dispatchGlobalEvent: jest.fn().mockImplementation((name, attributes) => {
            attributes.onCreate({
                close: () => {}
            });
        }),

        createComponent: jest.fn().mockImplementation((cmpName, attr, callback) => {
            const newComponent = {
                getElement: () => {}
            };
            callback(newComponent, 'SUCCESS', null);
        }),

        renderComponent: jest.fn().mockImplementation(() => {})
    };
});

jest.mock('builder_platform_interaction/storeUtils', () => {
    return {
        shouldUseAutoLayoutCanvas: jest.fn()
    };
});

const EDIT_MODE = 'editelement',
    ADD_MODE = 'addelement';

const getAttributes = (mode) => ({
    mode,
    node: {
        guid: 'd9e45a91-1dae-4acc-a0a8-69e0b316abe2',
        name: {
            value: 'record delete',
            error: null
        },
        description: {
            value: 'not a very good description I know',
            error: null
        },
        label: {
            value: 'record_delete',
            error: null
        },
        locationX: 356,
        locationY: 130,
        isCanvasElement: true,
        connectorCount: 1,
        config: {
            isSelected: true
        },
        inputReference: {
            value: '',
            error: null
        },
        object: {
            value: 'Account',
            error: null
        },
        filters: [
            {
                rowIndex: '81effde1-9e6f-4ff7-b879-bfd65538c509',
                leftHandSide: {
                    value: 'Account.BillingCity',
                    error: null
                },
                rightHandSide: {
                    value: 'CA',
                    error: null
                },
                rightHandSideDataType: {
                    value: 'String',
                    error: null
                },
                operator: {
                    value: 'EqualTo',
                    error: null
                }
            }
        ],
        maxConnections: 2,
        availableConnections: [
            {
                type: 'FAULT'
            }
        ],
        elementType: ELEMENT_TYPE.RECORD_DELETE,
        dataType: {
            value: 'Boolean',
            error: null
        }
    },
    nodeUpdate: jest.fn()
});

describe('builderUtils', () => {
    describe('Property Editor Config', () => {
        describe('Editor mode (edit, add) correctly returned', () => {
            const modePropertyNestedPath = 'attr.bodyComponent.attr.mode';
            test('Edit mode', () => {
                const actualResult = getPropertyEditorConfig(EDIT_MODE, getAttributes(EDIT_MODE));
                expect(actualResult).toHaveProperty(modePropertyNestedPath, EDIT_MODE);
            });
            test('Add mode', () => {
                const actualResult = getPropertyEditorConfig(ADD_MODE, getAttributes(ADD_MODE));
                expect(actualResult).toHaveProperty(modePropertyNestedPath, ADD_MODE);
            });
            it('sets className based on descriptor', () => {
                const params = getAttributes(ADD_MODE);

                const actualResult = getPropertyEditorConfig(ADD_MODE, params);

                expect(actualResult.attr.bodyComponent.className).toEqual(`${mockPackage}/${mockComponent}`);
            });
        });
    });

    describe('Popover', () => {
        it('showPopover', () => {
            expect(isPopoverOpen()).toBe(false);
            showPopover(
                'builder_platform_interaction:statusIconSummary',
                {},
                {
                    referenceElement: null,
                    onClose: () => {}
                }
            );
            expect(isPopoverOpen()).toBe(true);
        });
    });

    describe('createConfigurationEditor', () => {
        it('throws error if cmp name is not passed', () => {
            expect(() => {
                createConfigurationEditor();
            }).toThrow();
        });
        it('throws error if container is not passed', () => {
            expect(() => {
                createConfigurationEditor({
                    cmpName: 'abc'
                });
            }).toThrow();
        });
    });
});