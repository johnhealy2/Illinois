// @ts-nocheck
import { createElement } from 'lwc';
import { getElementByDevName } from 'builder_platform_interaction/storeUtils';
import AssignmentEditor from 'builder_platform_interaction/assignmentEditor';
import { getElementForPropertyEditor } from 'builder_platform_interaction/propertyEditorFactory';
import { setupStateForFlow, resetState, translateFlowToUIAndDispatch } from '../integrationTestUtils';
import {
    ticks,
    deepQuerySelector,
    INTERACTION_COMPONENTS_SELECTORS,
    clickPill,
    getComboboxPill,
    removeEvent
} from 'builder_platform_interaction/builderTestUtils';
import * as flowWithAllElements from 'mock/flows/flowWithAllElements.json';
import {
    validateExpression,
    getLhsCombobox,
    getRhsCombobox,
    selectOperator,
    getOperatorCombobox
} from '../expressionBuilderTestUtils';
import {
    selectComboboxItemBy,
    typeMergeFieldInCombobox,
    getComboboxItems,
    typeReferenceOrValueInCombobox,
    getComboboxGroupLabel,
    expectCanSelectInCombobox
} from '../comboboxTestUtils';
import { createVariable } from 'builder_platform_interaction/elementFactory';
import {
    addNewResourceEventListener,
    removeNewResourceEventListener,
    setNextInlineResource
} from '../inlineResourceTestUtils';

jest.mock('@salesforce/label/FlowBuilderElementLabels.actionAsResourceText', () => ({ default: 'Outputs from {0}' }), {
    virtual: true
});
jest.mock('@salesforce/label/FlowBuilderExpressionUtils.newResourceLabel', () => ({ default: 'New Resource' }), {
    virtual: true
});
jest.mock('@salesforce/label/FlowBuilderElementLabels.subflowAsResourceText', () => ({ default: 'Outputs from {0}' }), {
    virtual: true
});
jest.mock('@salesforce/label/FlowBuilderElementConfig.variablePluralLabel', () => ({ default: 'Variables' }), {
    virtual: true
});
jest.mock(
    '@salesforce/label/FlowBuilderElementConfig.sObjectPluralLabel',
    () => ({ default: 'Record (Single) Variables' }),
    { virtual: true }
);
jest.mock(
    '@salesforce/label/FlowBuilderElementConfig.apexVariablePluralLabel',
    () => ({ default: 'Apex-Defined Variables' }),
    { virtual: true }
);

jest.mock('@salesforce/label/FlowBuilderElementConfig.subflowPluralLabel', () => ({ default: 'Subflows' }), {
    virtual: true
});
jest.mock('@salesforce/label/FlowBuilderElementConfig.actionPluralLabel', () => ({ default: 'Actions' }), {
    virtual: true
});
jest.mock('@salesforce/label/FlowBuilderDataTypes.textDataTypeLabel', () => ({ default: 'Text' }), { virtual: true });

jest.mock(
    '@salesforce/label/FlowBuilderElementLabels.recordCreateIdAsResourceText',
    () => ({ default: '{0}Id from {1}' }),
    { virtual: true }
);

jest.mock(
    '@salesforce/label/FlowBuilderElementLabels.recordLookupAsResourceText',
    () => ({ default: '{0} from {1}' }),
    { virtual: true }
);
jest.mock(
    '@salesforce/label/FlowBuilderElementLabels.loopAsResourceText',
    () => {
        return { default: 'Current Item from Loop {0}' };
    },
    { virtual: true }
);
jest.mock(
    '@salesforce/label/FlowBuilderElementLabels.lightningComponentScreenFieldAsResourceText',
    () => {
        return { default: '{0}' };
    },
    { virtual: true }
);

const createComponentForTest = assignmentElement => {
    const el = createElement('builder_platform_interaction-assignment-editor', {
        is: AssignmentEditor
    });
    Object.assign(el, { node: assignmentElement });
    document.body.appendChild(el);
    return el;
};

const getFerToFerovExpressionBuilder = assignment =>
    deepQuerySelector(assignment, [INTERACTION_COMPONENTS_SELECTORS.FER_TO_FEROV_EXPRESSION_BUILDER]);

describe('Assignment Editor', () => {
    let assignment, expressionBuilder;
    beforeAll(async () => {
        const store = await setupStateForFlow(flowWithAllElements);
        translateFlowToUIAndDispatch(flowWithAllElements, store);
    });
    afterAll(() => {
        resetState();
    });
    beforeEach(async () => {
        const assignmentElement = getElementByDevName('assignment1');
        const assignmentForPropertyEditor = getElementForPropertyEditor(assignmentElement);
        assignment = createComponentForTest(assignmentForPropertyEditor);
        expressionBuilder = getFerToFerovExpressionBuilder(assignment);
    });
    describe('Validation', () => {
        const testExpression = {
            each: (strings, ...keys) => {
                it.each(strings, ...keys)(
                    'error for "$lhs $operator $rhs" should be : $rhsErrorMessage',
                    async ({ lhs, operator, rhs, rhsErrorMessage }) => {
                        expect(
                            await validateExpression(expressionBuilder, {
                                lhs,
                                operator,
                                rhs
                            })
                        ).toEqual({ rhsErrorMessage });
                    }
                );
                // just to workaround no-unused-expressions for template tag
                return () => undefined;
            }
        };
        describe('When LHS is a picklist', () => {
            testExpression.each`
            lhs                                            | operator    | rhs                                                     | rhsErrorMessage
            ${'{!accountSObjectVariable.AccountSource}'}   | ${'Assign'} | ${'Advertisement'}                                      | ${undefined}
            ${'{!accountSObjectVariable.AccountSource}'}   | ${'Assign'} | ${'NotAPicklistValue'}                                  | ${undefined}
            `();
        });
        describe('When LHS is a number', () => {
            testExpression.each`
            lhs                                            | operator    | rhs                                                     | rhsErrorMessage
            ${'{!accountSObjectVariable.BillingLatitude}'} | ${'Assign'} | ${'500.0'}                                              | ${undefined}
            ${'{!accountSObjectVariable.BillingLatitude}'} | ${'Assign'} | ${'not a number'}                                       | ${'FlowBuilderCombobox.numberErrorMessage'}
            ${'{!accountSObjectVariable.BillingLatitude}'} | ${'Add'}    | ${'{!accountSObjectVariable.Name}'}                     | ${'FlowBuilderMergeFieldValidation.invalidDataType'}
            `();
        });
        describe('cross-object field references', () => {
            it('does not allow a merge field with more than 10 levels', async () => {
                const lhs = '{!stringVariable}';
                const operator = 'Assign';
                const rhs =
                    '{!accountSObjectVariable.LastModifiedBy.CreatedBy.LastModifiedBy.CreatedBy.LastModifiedBy.CreatedBy.LastModifiedBy.CreatedBy.LastModifiedBy.Name}';
                expect(
                    await validateExpression(expressionBuilder, {
                        lhs,
                        operator,
                        rhs
                    })
                ).toEqual({
                    rhsErrorMessage: 'FlowBuilderMergeFieldValidation.maximumNumberOfLevelsReached'
                });
            });
            it('does allow a merge field with 9 levels', async () => {
                const lhs = '{!stringVariable}';
                const operator = 'Assign';
                const rhs =
                    '{!accountSObjectVariable.LastModifiedBy.CreatedBy.LastModifiedBy.CreatedBy.LastModifiedBy.CreatedBy.LastModifiedBy.CreatedBy.Name}';
                expect(
                    await validateExpression(expressionBuilder, {
                        lhs,
                        operator,
                        rhs
                    })
                ).toEqual({});
            });
            describe('When rhs is a cross-Object Field Reference using Polymorphic Relationships', () => {
                testExpression.each`
                lhs                                            | operator    | rhs                                                     | rhsErrorMessage
                ${'{!numberVariable}'}                         | ${'Assign'} | ${'{!feedItemVariable.Parent:Account.BillingLatitude}'} | ${undefined}
                ${'{!numberVariable}'}                         | ${'Assign'} | ${'{!feedItemVariable.Parent:Account.Name}'}            | ${'FlowBuilderMergeFieldValidation.invalidDataType'}
                `();
            });
            describe('Operator reset when changing LHS value if new value does not support previous operator', () => {
                let lhsCombobox;
                beforeEach(async () => {
                    lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                });
                function isOperatorReset(originalOperator) {
                    return getOperatorCombobox(expressionBuilder).value !== originalOperator;
                }
                it.each`
                    originalLhs                                    | originalOperator | newLhs                                          | resetOperator
                    ${'{!numberVariable}'}                         | ${'Subtract'}    | ${'{!accountSObjectVariable.BillingLongitude}'} | ${false}
                    ${'{!numberVariable}'}                         | ${'Add'}         | ${'{!stringVariable}'}                          | ${false}
                    ${'{!numberVariable}'}                         | ${'Subtract'}    | ${'{!stringVariable}'}                          | ${true}
                    ${'{!accountSObjectVariable.BillingLatitude}'} | ${'Add'}         | ${'{!accountSObjectVariable.BillingLongitude}'} | ${false}
                    ${'{!accountSObjectVariable.BillingLatitude}'} | ${'Subtract'}    | ${'{!numberVariable}'}                          | ${false}
                    ${'{!accountSObjectVariable.BillingLatitude}'} | ${'Subtract'}    | ${'{!accountSObjectVariable.Name}'}             | ${true}
                    ${'{!accountSObjectVariable.BillingLatitude}'} | ${'Subtract'}    | ${'{!accountSObjectVariable.Name}'}             | ${true}
                    ${'{!accountSObjectVariable.BillingLatitude}'} | ${'Subtract'}    | ${'{!accountSObjectVariable}'}                  | ${true}
                `(
                    'Should reset operator when switching LHS from $originalLhs to $newLhs: $resetOperator',
                    async ({ originalLhs, originalOperator, newLhs, resetOperator }) => {
                        await typeReferenceOrValueInCombobox(lhsCombobox, originalLhs, true);
                        expect(selectOperator(expressionBuilder, originalOperator)).toBe(true);
                        await typeReferenceOrValueInCombobox(lhsCombobox, newLhs, true);

                        expect(isOperatorReset(originalOperator)).toBe(resetOperator);
                    }
                );
            });
            it('Operator and RHS disabled (without pill) when LHS value is emptied (LHS was initially in pill mode)', async () => {
                const lhsCombobox = await getLhsCombobox(expressionBuilder);
                expect(lhsCombobox.pill).not.toBeNull();
                await typeReferenceOrValueInCombobox(lhsCombobox, '', true);
                const operatorCombobox = getOperatorCombobox(expressionBuilder);
                expect(operatorCombobox.disabled).toBe(true);
                const rhsCombobox = await getRhsCombobox(expressionBuilder);
                expect(rhsCombobox.pill).toBeNull();
                expect(rhsCombobox.disabled).toBe(true);
            });
            it('Operator and RHS disabled (without pill) when LHS pill removed)', async () => {
                const lhsCombobox = await getLhsCombobox(expressionBuilder);
                expect(lhsCombobox.pill).not.toBeNull();
                const pillCombobox = getComboboxPill(lhsCombobox);
                pillCombobox.dispatchEvent(removeEvent());
                await ticks(1);
                const operatorCombobox = getOperatorCombobox(expressionBuilder);
                expect(operatorCombobox.disabled).toBe(true);
                const rhsCombobox = await getRhsCombobox(expressionBuilder);
                expect(rhsCombobox.pill).toBeNull();
                expect(rhsCombobox.disabled).toBe(true);
            });
        });
        describe('When using Apex types on LHS or RHS', () => {
            testExpression.each`
            lhs                                             | operator    | rhs                                                     | rhsErrorMessage
            ${'{!apexCall_Car_automatic_output.car}'}       | ${'Assign'} | ${'{!apexCarVariable}'}                                 | ${undefined}
            ${'{!stringVariable}'}                          | ${'Assign'} | ${'{!apexCarVariable.wheel.type}'}                      | ${undefined}
            ${'{!apexComplexTypeVariable}'}                 | ${'Assign'} | ${'{!apexComplexTypeVariable}'}                         | ${undefined}
            ${'{!apexComplexTypeVariable.acct}'}            | ${'Assign'} | ${'{!apexComplexTypeVariable}'}                         | ${'FlowBuilderMergeFieldValidation.invalidDataType'}
            ${'{!apexComplexTypeVariable.acct}'}            | ${'Assign'} | ${'{!accountSObjectVariable}'}                          | ${undefined}
            ${'{!accountSObjectVariable}'}                  | ${'Assign'} | ${'{!apexComplexTypeVariable.acct}'}                    | ${undefined}
            ${'{!accountSObjectVariable}'}                  | ${'Assign'} | ${'{!apexComplexTypeVariable.doesNotExist}'}            | ${'FlowBuilderMergeFieldValidation.unknownRecordField'}
            `();
            it('can traverse more than 2 levels in the LHS', async () => {
                const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                expect(await selectComboboxItemBy(lhsCombobox, 'text', ['apexCarVariable', 'wheel'])).toMatchObject({
                    displayText: '{!apexCarVariable.wheel}'
                });
                await clickPill(lhsCombobox);
                expect(
                    await selectComboboxItemBy(lhsCombobox, 'text', ['apexCarVariable', 'wheel', 'type'])
                ).toMatchObject({
                    displayText: '{!apexCarVariable.wheel.type}'
                });
            });
            it('can traverse SObject in the Apex types', async () => {
                const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                expect(
                    await selectComboboxItemBy(lhsCombobox, 'text', [
                        'apexComplexTypeVariable',
                        'acct',
                        'AccountSource'
                    ])
                ).toMatchObject({
                    displayText: '{!apexComplexTypeVariable.acct.AccountSource}'
                });
            });
            it('cannot traverse more than one level of an SObject in the Apex types', async () => {
                const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                expect(
                    await selectComboboxItemBy(lhsCombobox, 'text', ['apexComplexTypeVariable', 'acct', 'CreatedBy'])
                ).toBeUndefined();
            });
        });
        describe('Automatic handling mode', () => {
            testExpression.each`
            lhs                                                | operator    | rhs                                                                                    | rhsErrorMessage
            ${'{!stringVariable}'}                             | ${'Assign'} | ${'{!apexCall_account_automatic_output.generatedAccount.LastModifiedBy.Account.Name}'} | ${undefined}
            ${'{!numberVariable}'}                             | ${'Assign'} | ${'{!apexCall_account_automatic_output.generatedAccount.LastModifiedBy.Account.Name}'} | ${'FlowBuilderMergeFieldValidation.invalidDataType'}
            ${'{!stringVariable}'}                             | ${'Assign'} | ${'{!lookupRecordAutomaticOutput.LastModifiedBy.Account.Name}'}                        | ${undefined}
            ${'{!numberVariable}'}                             | ${'Assign'} | ${'{!lookupRecordAutomaticOutput.LastModifiedBy.Account.Name}'}                        | ${'FlowBuilderMergeFieldValidation.invalidDataType'}
            ${'{!emailScreenFieldAutomaticOutput.disabled}'}   | ${'Assign'} | ${'{!$GlobalConstant.True}'}                                                           | ${undefined}
            ${'{!emailScreenFieldAutomaticOutput.disabled}'}   | ${'Assign'} | ${'myString'}                                                                          | ${'FlowBuilderCombobox.genericErrorMessage'}
            ${'{!stringVariable}'}                             | ${'Assign'} | ${'{!createAccountWithAutomaticOutput}'}                                               | ${undefined}
            ${'{!numberVariable}'}                             | ${'Assign'} | ${'{!createAccountWithAutomaticOutput}'}                                               | ${'FlowBuilderMergeFieldValidation.invalidDataType'}
            ${'{!subflowAutomaticOutput.output1}'}             | ${'Assign'} | ${'myString'}                                                                          | ${undefined}
            ${'{!subflowAutomaticOutput.carOutput.wheel.type}'}| ${'Assign'} | ${'myString'}                                                                          | ${undefined}
            ${'{!numberVariable}'}                             | ${'Assign'} | ${'{!subflowAutomaticOutput.accountOutput.BillingLatitude}'}                           | ${undefined}
            ${'{!numberVariable}'}                             | ${'Assign'} | ${'{!subflowAutomaticOutput.accountOutput.Name}'}                                      | ${'FlowBuilderMergeFieldValidation.invalidDataType'}
            `();
        });
    });
    describe('Inline Resource creation', () => {
        beforeEach(async () => {
            addNewResourceEventListener();
        });
        afterEach(() => {
            removeNewResourceEventListener();
        });
        it('autofills the combobox', async () => {
            const inlineVariable = createVariable({
                name: 'myInlineTextVar',
                dataType: 'String'
            });
            setNextInlineResource(inlineVariable);
            const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
            await selectComboboxItemBy(lhsCombobox, 'text', ['New Resource']);
            await ticks(50);
            expect(lhsCombobox.value).toMatchObject({
                dataType: 'String',
                displayText: '{!myInlineTextVar}'
            });
        });
    });
    describe('Traversal', () => {
        it('is limited to 10 levels', async () => {
            // Given
            const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
            const rhsCombobox = await getRhsCombobox(expressionBuilder, true);
            await typeMergeFieldInCombobox(lhsCombobox, '{!stringVariable}');
            selectOperator(expressionBuilder, 'Assign');

            // When
            const comboboxItem = await selectComboboxItemBy(
                rhsCombobox,
                'text',
                [
                    'accountSObjectVariable',
                    'LastModifiedBy',
                    'CreatedBy',
                    'LastModifiedBy',
                    'CreatedBy',
                    'LastModifiedBy',
                    'CreatedBy',
                    'LastModifiedBy',
                    'CreatedBy'
                ],
                { blur: false }
            );

            // Then
            expect(comboboxItem.hasNext).toBe(true);
            for (const item of getComboboxItems(rhsCombobox)) {
                expect(item.hasNext).toBeUndefined();
            }
        });
        it.each`
            lhs                                           | expectedErrorMessage
            ${'{!apexComplexTypeVariable.acct}'}          | ${null}
            ${'{!apexComplexTypeVariable.doesNotExist}'}  | ${'FlowBuilderMergeFieldValidation.unknownRecordField'}
            ${'{!apexComplexTypeVariable.doesNotExist.}'} | ${'FlowBuilderCombobox.genericErrorMessage'}
        `('error for "$lhs should be : $expectedErrorMessage', async ({ lhs, expectedErrorMessage }) => {
            const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
            await typeReferenceOrValueInCombobox(lhsCombobox, lhs);
            expect(lhsCombobox.errorMessage).toEqual(expectedErrorMessage);
        });
    });
    describe('pill', () => {
        describe('pill in error?', () => {
            describe('RHS change', () => {
                it('should  not display RHS pill in error after changing RHS value to one incompatible with LHS value', async () => {
                    const lhsCombobox = await getLhsCombobox(expressionBuilder);
                    expect(lhsCombobox.value.displayText).toEqual('{!stringVariable}');
                    expect(lhsCombobox.pill).toEqual({ label: 'stringVariable', iconName: 'utility:text' });
                    const rhsCombobox = await getRhsCombobox(expressionBuilder, true);
                    await typeMergeFieldInCombobox(rhsCombobox, '{!feedItemVariable}');
                    expect(rhsCombobox.errorMessage).not.toBeNull();
                    expect(rhsCombobox.pill).toBeNull();
                });
            });
        });
        describe('On typing and blur (LHS/RHS changes)', () => {
            describe('No error', () => {
                it.each`
                    lhs                                                          | rhs                                                          | expectedLhsPill                                                                                                    | expectedRhsPill
                    ${'{!feedItemVariable}'}                                     | ${'{!feedItemVariable}'}                                     | ${{ iconName: 'utility:sobject', label: 'feedItemVariable' }}                                                      | ${{ iconName: 'utility:sobject', label: 'feedItemVariable' }}
                    ${'{!stringVariable}'}                                       | ${'{!feedItemVariable.CreatedBy:User.Name}'}                 | ${{ iconName: 'utility:text', label: 'stringVariable' }}                                                           | ${{ iconName: 'utility:text', label: 'feedItemVariable > Created By ID (User) > Full Name' }}
                    ${'{!stringVariable}'}                                       | ${'{!stringConstant}'}                                       | ${{ iconName: 'utility:text', label: 'stringVariable' }}                                                           | ${{ iconName: 'utility:text', label: 'stringConstant' }}
                    ${'{!stringVariable}'}                                       | ${'{!textTemplate1}'}                                        | ${{ iconName: 'utility:text', label: 'stringVariable' }}                                                           | ${{ iconName: 'utility:text', label: 'textTemplate1' }}
                    ${'{!dateVariable}'}                                         | ${'{!dateVariable}'}                                         | ${{ iconName: 'utility:event', label: 'dateVariable' }}                                                            | ${{ iconName: 'utility:event', label: 'dateVariable' }}
                    ${'{!numberVariable}'}                                       | ${'{!numberVariable}'}                                       | ${{ iconName: 'utility:topic2', label: 'numberVariable' }}                                                         | ${{ iconName: 'utility:topic2', label: 'numberVariable' }}
                    ${'{!currencyVariable}'}                                     | ${'{!currencyVariable}'}                                     | ${{ iconName: 'utility:currency', label: 'currencyVariable' }}                                                     | ${{ iconName: 'utility:currency', label: 'currencyVariable' }}
                    ${'{!feedItemVariable.IsClosed}'}                            | ${'{!feedItemVariable.IsClosed}'}                            | ${{ iconName: 'utility:crossfilter', label: 'feedItemVariable > Is Closed' }}                                      | ${{ iconName: 'utility:crossfilter', label: 'feedItemVariable > Is Closed' }}
                    ${'{!apexComplexTypeVariable.acct}'}                         | ${'{!apexComplexTypeVariable.acct}'}                         | ${{ iconName: 'utility:sobject', label: 'apexComplexTypeVariable > acct' }}                                        | ${{ iconName: 'utility:sobject', label: 'apexComplexTypeVariable > acct' }}
                    ${'{!apexComplexTypeVariable.acct.BillingCity}'}             | ${'{!apexComplexTypeVariable.acct.BillingCity}'}             | ${{ iconName: 'utility:text', label: 'apexComplexTypeVariable > acct > Billing City' }}                            | ${{ iconName: 'utility:text', label: 'apexComplexTypeVariable > acct > Billing City' }}
                    ${'{!feedItemVariable.IsClosed}'}                            | ${'{!feedItemVariable.IsClosed}'}                            | ${{ iconName: 'utility:crossfilter', label: 'feedItemVariable > Is Closed' }}                                      | ${{ iconName: 'utility:crossfilter', label: 'feedItemVariable > Is Closed' }}
                    ${'{!emailScreenFieldAutomaticOutput.readonly}'}             | ${'{!emailScreenFieldAutomaticOutput.readonly}'}             | ${{ iconName: 'utility:crossfilter', label: 'emailScreenFieldAutomaticOutput > Read Only' }}                       | ${{ iconName: 'utility:crossfilter', label: 'emailScreenFieldAutomaticOutput > Read Only' }}
                    ${'{!apexCall_Car_automatic_output.car}'}                    | ${'{!apexCall_Car_automatic_output.car}'}                    | ${{ iconName: 'utility:apex', label: 'Outputs from apexCall_Car_automatic_output > car' }}                         | ${{ iconName: 'utility:apex', label: 'Outputs from apexCall_Car_automatic_output > car' }}
                    ${'{!subflowAutomaticOutput.accountOutput}'}                 | ${'{!subflowAutomaticOutput.accountOutput}'}                 | ${{ iconName: 'utility:sobject', label: 'Outputs from subflowAutomaticOutput > accountOutput' }}                   | ${{ iconName: 'utility:sobject', label: 'Outputs from subflowAutomaticOutput > accountOutput' }}
                    ${'{!subflowAutomaticOutput.accountOutput.BillingLatitude}'} | ${'{!subflowAutomaticOutput.accountOutput.BillingLatitude}'} | ${{ iconName: 'utility:topic2', label: 'Outputs from subflowAutomaticOutput > accountOutput > Billing Latitude' }} | ${{ iconName: 'utility:topic2', label: 'Outputs from subflowAutomaticOutput > accountOutput > Billing Latitude' }}
                    ${'{!lookupRecordAutomaticOutput}'}                          | ${'{!lookupRecordAutomaticOutput}'}                          | ${{ iconName: 'utility:sobject', label: 'Account from lookupRecordAutomaticOutput' }}                              | ${{ iconName: 'utility:sobject', label: 'Account from lookupRecordAutomaticOutput' }}
                    ${'{!lookupRecordAutomaticOutput.BillingCity}'}              | ${'{!lookupRecordAutomaticOutput.BillingCity}'}              | ${{ iconName: 'utility:text', label: 'Account from lookupRecordAutomaticOutput > Billing City' }}                  | ${{ iconName: 'utility:text', label: 'Account from lookupRecordAutomaticOutput > Billing City' }}
                `(
                    'LHS Pill should be: $expectedLhsPill for LHS: $lhs, RHS pill should be: $expectedRhsPill for RHS: $rhs',
                    async ({ lhs, rhs, expectedLhsPill, expectedRhsPill }) => {
                        const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                        await typeMergeFieldInCombobox(lhsCombobox, lhs);
                        expect(lhsCombobox.pill).toEqual(expectedLhsPill);
                        const rhsCombobox = await getRhsCombobox(expressionBuilder, true);
                        await typeMergeFieldInCombobox(rhsCombobox, rhs);
                        expect(rhsCombobox.pill).toEqual(expectedRhsPill);
                    }
                );
            });
            describe('LHS error', () => {
                describe('RHS emptied', () => {
                    beforeEach(async () => {
                        const rhsCombobox = await getRhsCombobox(expressionBuilder, true);
                        await typeReferenceOrValueInCombobox(rhsCombobox, '');
                    });
                    it.each`
                        lhs
                        ${'{!feedItemVariableItDoesNotExistThatsForSure}'}
                        ${'{!feedItemVariable.CreatedBy:User.Name}'}
                        ${'{!apexComplexTypeVariable.acct.BillingCity2}'}
                    `('LHS should have no pill as in error state with empty RHS', async ({ lhs }) => {
                        const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                        await typeMergeFieldInCombobox(lhsCombobox, lhs);
                        expect(lhsCombobox.errorMessage).not.toBeNull();
                        expect(lhsCombobox.pill).toBeNull();
                    });
                });
                describe('RHS kept as it is (incompatible type)', () => {
                    it('should see RHS pill in error after changing LHS value to one incompatible with RHS value', async () => {
                        const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                        expect(lhsCombobox.pill).toBeNull();
                        expect(lhsCombobox.value.displayText).toEqual('{!stringVariable}');
                        await selectComboboxItemBy(lhsCombobox, 'text', ['feedItemVariable']);
                        expect(lhsCombobox.value.displayText).toEqual('{!feedItemVariable}');
                        expect(lhsCombobox.pill).toEqual({ label: 'feedItemVariable', iconName: 'utility:sobject' });
                        const rhsCombobox = await getRhsCombobox(expressionBuilder);
                        expect(rhsCombobox.errorMessage).not.toBeNull();
                        expect(rhsCombobox.hasPillError).toBe(true);
                        expect(rhsCombobox.pill).toEqual({ label: 'numberVariable', iconName: 'utility:topic2' });
                        expect(rhsCombobox.pillTooltip).toEqual(expect.stringContaining(rhsCombobox.errorMessage));
                    });
                });
            });
            describe('RHS error', () => {
                beforeEach(async () => {
                    const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                    await typeMergeFieldInCombobox(lhsCombobox, '{!dateVariable}');
                });
                it.each`
                    rhs
                    ${'{!feedItemVariable}'}
                    ${'{!feedItemVariableItDoesNotExistThatsForSure}'}
                    ${'{!feedItemVariable.CreatedBy:User.Name}'}
                    ${'{!feedItemVariable.IsClosed}'}
                    ${'{!apexComplexTypeVariable.acct}'}
                    ${'{!apexComplexTypeVariable.acct.BillingCity}'}
                    ${'{!accountSObjectVariable}'}
                `(
                    'RHS should have no pill as in error state for RHS: $rhs and LHS (with incompatible type): {!dateVariable}',
                    async ({ rhs }) => {
                        const rhsCombobox = await getRhsCombobox(expressionBuilder, true);
                        await typeMergeFieldInCombobox(rhsCombobox, rhs);
                        expect(rhsCombobox.errorMessage).not.toBeNull();
                        expect(rhsCombobox.pill).toBeNull();
                    }
                );
            });
        });
        describe('On selecting and blur (LHS/RHS changes)', () => {
            describe('No error', () => {
                it.each`
                    lhs                                                                    | rhs                                                                    | expectedLhsPill                                                                                                    | expectedRhsPill
                    ${'feedItemVariable'}                                                  | ${'feedItemVariable'}                                                  | ${{ iconName: 'utility:sobject', label: 'feedItemVariable' }}                                                      | ${{ iconName: 'utility:sobject', label: 'feedItemVariable' }}
                    ${'stringVariable'}                                                    | ${'stringVariable'}                                                    | ${{ iconName: 'utility:text', label: 'stringVariable' }}                                                           | ${{ iconName: 'utility:text', label: 'stringVariable' }}
                    ${'stringVariable'}                                                    | ${'feedItemVariable.CreatedBy (User).Name'}                            | ${{ iconName: 'utility:text', label: 'stringVariable' }}                                                           | ${{ iconName: 'utility:text', label: 'feedItemVariable > Created By ID (User) > Full Name' }}
                    ${'stringVariable'}                                                    | ${'stringConstant'}                                                    | ${{ iconName: 'utility:text', label: 'stringVariable' }}                                                           | ${{ iconName: 'utility:text', label: 'stringConstant' }}
                    ${'stringVariable'}                                                    | ${'textTemplate1'}                                                     | ${{ iconName: 'utility:text', label: 'stringVariable' }}                                                           | ${{ iconName: 'utility:text', label: 'textTemplate1' }}
                    ${'dateVariable'}                                                      | ${'dateVariable'}                                                      | ${{ iconName: 'utility:event', label: 'dateVariable' }}                                                            | ${{ iconName: 'utility:event', label: 'dateVariable' }}
                    ${'numberVariable'}                                                    | ${'numberVariable'}                                                    | ${{ iconName: 'utility:topic2', label: 'numberVariable' }}                                                         | ${{ iconName: 'utility:topic2', label: 'numberVariable' }}
                    ${'currencyVariable'}                                                  | ${'currencyVariable'}                                                  | ${{ iconName: 'utility:currency', label: 'currencyVariable' }}                                                     | ${{ iconName: 'utility:currency', label: 'currencyVariable' }}
                    ${'Outputs from apexCall_Car_automatic_output.car'}                    | ${'Outputs from apexCall_Car_automatic_output.car'}                    | ${{ iconName: 'utility:apex', label: 'Outputs from apexCall_Car_automatic_output > car' }}                         | ${{ iconName: 'utility:apex', label: 'Outputs from apexCall_Car_automatic_output > car' }}
                    ${'Outputs from subflowAutomaticOutput.accountOutput'}                 | ${'Outputs from subflowAutomaticOutput.accountOutput'}                 | ${{ iconName: 'utility:sobject', label: 'Outputs from subflowAutomaticOutput > accountOutput' }}                   | ${{ iconName: 'utility:sobject', label: 'Outputs from subflowAutomaticOutput > accountOutput' }}
                    ${'Outputs from subflowAutomaticOutput.accountOutput.BillingLatitude'} | ${'Outputs from subflowAutomaticOutput.accountOutput.BillingLatitude'} | ${{ iconName: 'utility:topic2', label: 'Outputs from subflowAutomaticOutput > accountOutput > Billing Latitude' }} | ${{ iconName: 'utility:topic2', label: 'Outputs from subflowAutomaticOutput > accountOutput > Billing Latitude' }}
                    ${'accountSObjectVariable'}                                            | ${'accountSObjectVariable'}                                            | ${{ iconName: 'utility:sobject', label: 'accountSObjectVariable' }}                                                | ${{ iconName: 'utility:sobject', label: 'accountSObjectVariable' }}
                    ${'accountSObjectVariable.BillingCity'}                                | ${'accountSObjectVariable.BillingCity'}                                | ${{ iconName: 'utility:text', label: 'accountSObjectVariable > Billing City' }}                                    | ${{ iconName: 'utility:text', label: 'accountSObjectVariable > Billing City' }}
                    ${'Account from lookupRecordAutomaticOutput'}                          | ${'Account from lookupRecordAutomaticOutput'}                          | ${{ iconName: 'utility:sobject', label: 'Account from lookupRecordAutomaticOutput' }}                              | ${{ iconName: 'utility:sobject', label: 'Account from lookupRecordAutomaticOutput' }}
                    ${'Account from lookupRecordAutomaticOutput.BillingCity'}              | ${'Account from lookupRecordAutomaticOutput.BillingCity'}              | ${{ iconName: 'utility:text', label: 'Account from lookupRecordAutomaticOutput > Billing City' }}                  | ${{ iconName: 'utility:text', label: 'Account from lookupRecordAutomaticOutput > Billing City' }}
                    ${'apexComplexTypeVariable.acct'}                                      | ${'apexComplexTypeVariable.acct'}                                      | ${{ iconName: 'utility:sobject', label: 'apexComplexTypeVariable > acct' }}                                        | ${{ iconName: 'utility:sobject', label: 'apexComplexTypeVariable > acct' }}
                    ${'apexComplexTypeVariable.acct.BillingCity'}                          | ${'apexComplexTypeVariable.acct.BillingCity'}                          | ${{ iconName: 'utility:text', label: 'apexComplexTypeVariable > acct > Billing City' }}                            | ${{ iconName: 'utility:text', label: 'apexComplexTypeVariable > acct > Billing City' }}
                    ${'feedItemVariable.IsClosed'}                                         | ${'feedItemVariable.IsClosed'}                                         | ${{ iconName: 'utility:crossfilter', label: 'feedItemVariable > Is Closed' }}                                      | ${{ iconName: 'utility:crossfilter', label: 'feedItemVariable > Is Closed' }}
                `(
                    'LHS Pill should be: $expectedLhsPill for LHS: $lhs , RHS pill should be: $expectedRhsPill for RHS: $rhs',
                    async ({ lhs, rhs, expectedLhsPill, expectedRhsPill }) => {
                        const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                        await selectComboboxItemBy(lhsCombobox, 'text', lhs.split('.'));
                        expect(lhsCombobox.pill).toEqual(expectedLhsPill);
                        const rhsCombobox = await getRhsCombobox(expressionBuilder, true);
                        await selectComboboxItemBy(rhsCombobox, 'text', rhs.split('.'));
                        expect(rhsCombobox.pill).toEqual(expectedRhsPill);
                    }
                );
            });
        });
    });
    describe('Selection using comboboxes', () => {
        const itCanSelectInLhs = (lhs, expectedItem = {}) =>
            it(`can select [${lhs}] on lhs`, async () => {
                const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                await expectCanSelectInCombobox(lhsCombobox, 'text', lhs, expectedItem);
            });
        const itCanSelectInRhs = (rhs, expectedItem = {}) =>
            it(`can select [${rhs}] on rhs`, async () => {
                const rhsCombobox = await getRhsCombobox(expressionBuilder, true);
                await expectCanSelectInCombobox(rhsCombobox, 'text', rhs, expectedItem);
            });
        describe('groups', () => {
            it.each`
                item                                                 | group
                ${'apexComplexTypeVariable'}                         | ${'APEX-DEFINED VARIABLES'}
                ${'Outputs from subflowAutomaticOutput'}             | ${'SUBFLOWS'}
                ${'Outputs from apexCall_Car_automatic_output'}      | ${'ACTIONS'}
                ${'AccountId from createAccountWithAutomaticOutput'} | ${'VARIABLES'}
                ${'Account from lookupRecordAutomaticOutput'}        | ${'RECORD (SINGLE) VARIABLES'}
            `('$item should be in group $group', async ({ item, group }) => {
                const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                const groupLabel = getComboboxGroupLabel(lhsCombobox, 'text', item);
                expect(groupLabel).toEqual(group);
            });
        });
        describe('apex variables', () => {
            itCanSelectInLhs(['apexComplexTypeVariable', 'acct'], {
                iconName: 'utility:sobject',
                displayText: '{!apexComplexTypeVariable.acct}'
            });
            itCanSelectInLhs(['apexComplexTypeVariable', 'acct', 'Name'], {
                displayText: '{!apexComplexTypeVariable.acct.Name}'
            });
        });
        describe('lookup records automatic output', () => {
            itCanSelectInLhs(['Account from lookupRecordAutomaticOutput'], {
                iconName: 'utility:sobject',
                displayText: '{!lookupRecordAutomaticOutput}'
            });
            itCanSelectInLhs(['Account from lookupRecordAutomaticOutput', 'Name'], {
                displayText: '{!lookupRecordAutomaticOutput.Name}'
            });
            itCanSelectInRhs(['Account from lookupRecordAutomaticOutput', 'Name'], {
                displayText: '{!lookupRecordAutomaticOutput.Name}'
            });
        });
        describe('create records automatic output', () => {
            itCanSelectInLhs(['AccountId from createAccountWithAutomaticOutput'], {
                iconName: 'utility:text',
                subTextNoHighlight: 'Text',
                displayText: '{!createAccountWithAutomaticOutput}'
            });
            itCanSelectInRhs(['AccountId from createAccountWithAutomaticOutput'], {
                iconName: 'utility:text',
                subTextNoHighlight: 'Text',
                displayText: '{!createAccountWithAutomaticOutput}'
            });
        });
        describe('action automatic output', () => {
            itCanSelectInLhs(['Outputs from apexCall_Car_automatic_output', 'car'], {
                iconName: 'utility:apex',
                displayText: '{!apexCall_Car_automatic_output.car}'
            });
        });
        describe('subflow automatic output', () => {
            it('The items in the combobox are the output variables from the active version', async () => {
                const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                await selectComboboxItemBy(lhsCombobox, 'text', ['Outputs from subflowAutomaticOutput'], {
                    blur: false
                });
                expect(getComboboxItems(lhsCombobox)).toEqual([
                    expect.objectContaining({ text: 'accountOutput' }),
                    expect.objectContaining({ text: 'carOutput' }),
                    expect.objectContaining({ text: 'accountOutputCollection' }),
                    expect.objectContaining({ text: 'carOutputCollection' }),
                    expect.objectContaining({ text: 'inputOutput1' }),
                    expect.objectContaining({ text: 'inputOutput2' }),
                    expect.objectContaining({ text: 'output1' }),
                    expect.objectContaining({ text: 'output2' }),
                    expect.objectContaining({ text: 'output3' })
                ]);
            });
            itCanSelectInLhs(['Outputs from subflowAutomaticOutput', 'output2'], {
                displayText: '{!subflowAutomaticOutput.output2}'
            });
            itCanSelectInLhs(['Outputs from subflowAutomaticOutput', 'accountOutput'], {
                displayText: '{!subflowAutomaticOutput.accountOutput}'
            });
            itCanSelectInLhs(['Outputs from subflowAutomaticOutput', 'accountOutput', 'Name'], {
                displayText: '{!subflowAutomaticOutput.accountOutput.Name}'
            });
            itCanSelectInLhs(['Outputs from subflowAutomaticOutput', 'carOutput', 'wheel', 'type'], {
                displayText: '{!subflowAutomaticOutput.carOutput.wheel.type}'
            });
        });
        describe('loop automatic output', () => {
            itCanSelectInLhs(['Current Item from Loop loopOnAccountAutoOutput', 'Name'], {
                displayText: '{!loopOnAccountAutoOutput.Name}'
            });
            itCanSelectInLhs(['Current Item from Loop loopOnTextCollectionAutoOutput'], {
                displayText: '{!loopOnTextCollectionAutoOutput}'
            });
            itCanSelectInLhs(['Current Item from Loop loopOnApexAutoOutput', 'name'], {
                displayText: '{!loopOnApexAutoOutput.name}'
            });
            it('cannot select loop with manual output', async () => {
                const lhsCombobox = await getLhsCombobox(expressionBuilder, true);
                await typeReferenceOrValueInCombobox(lhsCombobox, '{!loopOnTextCollectionManualOutput}');
                expect(lhsCombobox.errorMessage).toBe('FlowBuilderCombobox.genericErrorMessage');
            });
        });
    });
});
