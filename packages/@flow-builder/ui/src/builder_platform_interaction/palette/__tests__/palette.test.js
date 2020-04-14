import { createElement } from 'lwc';
import { PaletteItemChevronClickedEvent, LocatorIconClickedEvent } from 'builder_platform_interaction/events';
import Palette from 'builder_platform_interaction/palette';
import { LABELS } from '../paletteLabels';
import { ticks } from 'builder_platform_interaction/builderTestUtils';

jest.mock('builder_platform_interaction/loggingUtils', () => ({
    logInteraction: jest.fn()
}));

const createComponentUnderTest = (data, detailsButton, showLocatorIcon = 'false') => {
    const el = createElement('builder_platform_interaction-palette', {
        is: Palette
    });
    el.data = data;
    el.detailsButton = detailsButton;
    el.showLocatorIcon = showLocatorIcon;
    document.body.appendChild(el);
    return el;
};

const selectors = {
    sectionChevron: '.test-section-chevron-icon',
    detailsChevron: '.test-details-chevron-icon',
    locatorIcon: '.test-locator-icon',
    row: 'tr',
    text: 'div.slds-truncate'
};

// TODO: Later on we may expose an attribute that lets us specify which
// sections are initially collapsed. When we have that we should be able to
// separate collapse and expand tests.
const verifyToggle = async (palette, selector) => {
    const toggle = palette.shadowRoot.querySelector(selector);

    // Collapses the first section.
    toggle.click();
    await ticks(2);
    let rows = palette.shadowRoot.querySelectorAll('tr');
    expect(rows).toHaveLength(1);

    // Expands the first section.
    toggle.click();
    await ticks(1);
    rows = palette.shadowRoot.querySelectorAll('tr');
    expect(rows).toHaveLength(3);
};

describe('Palette', () => {
    describe('section toggle', () => {
        const ELEMENT_DATA = [
            {
                guid: 'myGuid1',
                label: 'myLabel',
                _children: [
                    {
                        elementType: 'Variable',
                        guid: 'myGuid2',
                        label: 'myLabel',
                        iconName: 'myIconName'
                    },
                    {
                        elementType: 'Variable',
                        guid: 'myGuid3',
                        label: 'myLabel',
                        iconName: 'myIconName'
                    }
                ]
            }
        ];

        // TODO: Temporary assertion count until we can initialize sections as
        // collapsed.
        beforeEach(() => {
            expect.assertions(2);
        });

        it('collapses an expands a palette section using the chevron', async () => {
            const palette = createComponentUnderTest(ELEMENT_DATA);
            await verifyToggle(palette, selectors.sectionChevron);
        });

        it('collapses and expands a palette section by clicking the section text', async () => {
            const palette = createComponentUnderTest(ELEMENT_DATA);
            await verifyToggle(palette, selectors.text);
        });

        it('collapses and expands a palette section by clicking on the row', async () => {
            const palette = createComponentUnderTest(ELEMENT_DATA);
            await verifyToggle(palette, selectors.row);
        });
    });

    describe('Manager Tab', () => {
        const ELEMENT_DATA = [
            {
                elementType: 'Variable',
                guid: 'myGuid1',
                label: 'myLabel',
                iconName: 'myIconName'
            }
        ];

        it('checks that there is no chevron button when detailsButton is false', async () => {
            const palette = createComponentUnderTest(ELEMENT_DATA);
            await ticks(1);
            const chevron = palette.shadowRoot.querySelector(selectors.detailsChevron);
            expect(chevron).toBeNull();
        });

        it('checks that there is a chevron button when detailsButton is true', async () => {
            const palette = createComponentUnderTest(ELEMENT_DATA, 'true');
            await ticks(1);
            const chevron = palette.shadowRoot.querySelector(selectors.detailsChevron);
            expect(chevron).not.toBeNull();
            expect(chevron.iconName).toEqual('utility:chevronright');
            expect(chevron.alternativeText).toEqual(LABELS.detailsText);
        });

        it('clicks the chevron to dispatch a PaletteItemChevronClickedEvent with the guid and iconName', async () => {
            const palette = createComponentUnderTest(ELEMENT_DATA, 'true');
            await ticks(1);
            const eventCallback = jest.fn();
            palette.addEventListener(PaletteItemChevronClickedEvent.EVENT_NAME, eventCallback);
            const chevron = palette.shadowRoot.querySelector(selectors.detailsChevron);
            chevron.click();

            expect(eventCallback).toHaveBeenCalled();
            expect(eventCallback.mock.calls[0][0]).toMatchObject({
                detail: {
                    elementGUID: ELEMENT_DATA[0].guid,
                    iconName: ELEMENT_DATA[0].iconName
                }
            });
        });

        it('checks that there is no locator icon when showLocatorIcon is false', async () => {
            const palette = createComponentUnderTest(ELEMENT_DATA, 'true', false);
            await ticks(1);
            const locatorIcon = palette.shadowRoot.querySelector(selectors.locatorIcon);
            expect(locatorIcon).toBeNull();
        });

        it('checks that there is a locator icon when showLocatorIcon is true', async () => {
            const palette = createComponentUnderTest(ELEMENT_DATA, 'true', true);
            await ticks(1);
            const locatorIcon = palette.shadowRoot.querySelector(selectors.locatorIcon);
            expect(locatorIcon).not.toBeNull();
            expect(locatorIcon.iconName).toEqual('utility:search');
            expect(locatorIcon.alternativeText).toEqual(LABELS.locatorIconText);
        });

        it('clicks the locator icon to dispatch a LocatorIconClickedEvent with the guid', async () => {
            const palette = createComponentUnderTest(ELEMENT_DATA, 'true', true);
            await ticks(1);
            const eventCallback = jest.fn();
            palette.addEventListener(LocatorIconClickedEvent.EVENT_NAME, eventCallback);
            const locatorIcon = palette.shadowRoot.querySelector(selectors.locatorIcon);
            locatorIcon.click();

            expect(eventCallback).toHaveBeenCalled();
            expect(eventCallback.mock.calls[0][0].detail).toMatchObject({
                elementGuid: ELEMENT_DATA[0].guid
            });
        });
    });
});