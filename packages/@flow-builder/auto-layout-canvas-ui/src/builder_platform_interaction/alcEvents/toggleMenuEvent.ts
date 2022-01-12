import { ConnectionSource, ElementMetadata, MenuType, Option } from 'builder_platform_interaction/autoLayoutCanvas';

const eventName = 'togglemenu';

interface ToggleMenuEventDetail {
    top: number;
    left: number;
    offsetX: number;
    type: MenuType;
    elementMetadata: ElementMetadata;
    source: ConnectionSource;
    conditionOptionsForNode?: Option[] | undefined;
    moveFocusToMenu?: boolean;
}

export class ToggleMenuEvent extends CustomEvent<ToggleMenuEventDetail> {
    constructor(detail) {
        super(eventName, {
            bubbles: true,
            composed: true,
            cancelable: true,
            detail
        });
    }

    static EVENT_NAME = eventName;
}
