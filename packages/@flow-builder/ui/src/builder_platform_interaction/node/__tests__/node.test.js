import { createElement } from 'lwc';
import { EditElementEvent, DeleteElementEvent, CANVAS_EVENT } from "builder_platform_interaction/events";
import Node from "builder_platform_interaction/node";
import { getShadowRoot } from 'lwc-test-utils';
import {isTestMode} from 'builder_platform_interaction/contextLib';

const ELEMENT_TYPE = 'ASSIGNMENT';
const createComponentUnderTest = (isSelected) => {
    const el = createElement('builder_platform_interaction-node', {
        is: Node
    });
    el.node = {
        guid: '1',
        locationX : '20px',
        locationY : '40px',
        elementType : ELEMENT_TYPE,
        label : 'First Node',
        description : 'My first test node',
        config: {isSelected}
    };
    document.body.appendChild(el);
    return el;
};

const selectors = {
    nodeContainer: '.node-container',
    iconSelected: '.icon-section.selected',
    icon: '.icon',
    trash: '.trash-can'
};

jest.mock('builder_platform_interaction/contextLib', () => ({
    isTestMode: jest.fn()
}));

const dblClick = (component) => {
    const doubleClickEvent = new Event('dblclick', {
        'bubbles'   : true,
        'cancelable': true,
    });
    const nodeIcon = getShadowRoot(component).querySelector(selectors.icon);
    nodeIcon.dispatchEvent(doubleClickEvent);
};

describe('node', () => {
    it('Checks if node is rendered correctly', () => {
        const nodeComponent = createComponentUnderTest(false);
            expect(nodeComponent.node.guid).toEqual('1');
            expect(nodeComponent.node.locationX).toEqual('20px');
            expect(nodeComponent.node.locationY).toEqual('40px');
            expect(nodeComponent.node.elementType).toEqual(ELEMENT_TYPE);
            expect(nodeComponent.node.label).toEqual('First Node');
            expect(nodeComponent.node.description).toEqual('My first test node');
            expect(nodeComponent.node.config.isSelected).toBeFalsy();
    });

    it('Checks if node selected event is dispatched when icon is clicked', () => {
        const nodeComponent = createComponentUnderTest(false);
        return Promise.resolve().then(() => {
            const callback = jest.fn();
            nodeComponent.addEventListener(CANVAS_EVENT.NODE_SELECTED, callback);
            getShadowRoot(nodeComponent).querySelector(selectors.icon).click();
            expect(callback).toHaveBeenCalled();
        });
    });

    it('Checks if node selected event is dispatched when selected icon is clicked', () => {
        const nodeComponent = createComponentUnderTest(true);
        return Promise.resolve().then(() => {
            const callback = jest.fn();
            nodeComponent.addEventListener(CANVAS_EVENT.NODE_SELECTED, callback);
            getShadowRoot(nodeComponent).querySelector(selectors.icon).click();
            expect(callback).toHaveBeenCalled();
        });
    });


    it('Checks if a selected node has the right styling', () => {
        const nodeComponent = createComponentUnderTest(true);
        expect(getShadowRoot(nodeComponent).querySelector(selectors.iconSelected)).toBeTruthy();
    });

    it('Checks if an EditElementEvent is dispatched when icon is double clicked', () => {
        const nodeComponent = createComponentUnderTest(false);
        return Promise.resolve().then(() => {
            const callback = jest.fn();
            nodeComponent.addEventListener(EditElementEvent.EVENT_NAME, callback);
            dblClick(nodeComponent);
            expect(callback).toHaveBeenCalled();
            expect(callback.mock.calls[0][0]).toMatchObject({
                detail: {
                    canvasElementGUID: nodeComponent.node.guid
                }
            });
        });
    });

    it('Checks if node delete event is dispatched when trash is clicked', () => {
        const nodeComponent = createComponentUnderTest(true);
        return Promise.resolve().then(() => {
            const callback = jest.fn();
            nodeComponent.addEventListener(DeleteElementEvent.EVENT_NAME, callback);
            getShadowRoot(nodeComponent).querySelector(selectors.trash).click();
            expect(callback).toHaveBeenCalled();
        });
    });

    describe('parent div class', () => {
        const testModeSpecificClassName = `test-node-${ELEMENT_TYPE.toLowerCase()}`;
        let parentDiv;
        it('in test mode  (test class added for parent div)', () => {
            isTestMode.mockReturnValue(true);
            const node = createComponentUnderTest();
            parentDiv = getShadowRoot(node).querySelector('div');
            expect(parentDiv.classList).toContain(testModeSpecificClassName);
        });
        it('NOT in test mode (no test class added for parent div)', () => {
            isTestMode.mockReturnValue(false);
            const node = createComponentUnderTest();
            parentDiv = getShadowRoot(node).querySelector('div');
            expect(parentDiv.classList).not.toContain(testModeSpecificClassName);
        });
    });
});