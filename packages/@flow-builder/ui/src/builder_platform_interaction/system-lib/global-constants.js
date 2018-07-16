import globalConstantEmptyStringLabel from '@label/FlowBuilderGlobalConstants.globalConstantEmptyString';
import globalConstantTrueLabel from '@label/FlowBuilderGlobalConstants.globalConstantTrue';
import globalConstantFalseLabel from '@label/FlowBuilderGlobalConstants.globalConstantFalse';
import globalConstantCategory from '@label/FlowBuilderGlobalConstants.globalConstantCategory';
import { FEROV_DATA_TYPE } from 'builder_platform_interaction-data-type-lib';

export const GLOBAL_CONSTANT_PREFIX = '$GlobalConstant.';

export const GLOBAL_CONSTANTS = {
    EMPTY_STRING: `${GLOBAL_CONSTANT_PREFIX}EmptyString`,
    BOOLEAN_TRUE: `${GLOBAL_CONSTANT_PREFIX}True`,
    BOOLEAN_FALSE: `${GLOBAL_CONSTANT_PREFIX}False`,
};

/**
 * Descriptions of the GLOBAL_CONSTANTS variables in a shape that looks like
 * elements. name, guid, and category are only necessary so that these
 * play nicely with being used in the combobox.
 *
 * NOTE: Any constants added here also need to be added to the menu data selectors.
 */
export const GLOBAL_CONSTANT_OBJECTS = {
    [GLOBAL_CONSTANTS.BOOLEAN_TRUE] : {
        label: globalConstantTrueLabel,
        name: GLOBAL_CONSTANTS.BOOLEAN_TRUE,
        guid: GLOBAL_CONSTANTS.BOOLEAN_TRUE,
        isCollection: false,
        dataType: FEROV_DATA_TYPE.BOOLEAN,
        category: globalConstantCategory,
    },
    [GLOBAL_CONSTANTS.BOOLEAN_FALSE] : {
        label: globalConstantFalseLabel,
        name: GLOBAL_CONSTANTS.BOOLEAN_FALSE,
        guid: GLOBAL_CONSTANTS.BOOLEAN_FALSE,
        isCollection: false,
        dataType: FEROV_DATA_TYPE.BOOLEAN,
        category: globalConstantCategory,
    },
    [GLOBAL_CONSTANTS.EMPTY_STRING] : {
        label: globalConstantEmptyStringLabel,
        name: GLOBAL_CONSTANTS.EMPTY_STRING,
        guid: GLOBAL_CONSTANTS.EMPTY_STRING,
        isCollection: false,
        dataType: FEROV_DATA_TYPE.STRING,
        category: globalConstantCategory,
    },
};
