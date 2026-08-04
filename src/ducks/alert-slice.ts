import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { MessageModel } from 'types/alerts';

export type State = {
    messages: MessageModel[];
    msgId: number;
};

export const initialState: State = {
    messages: [],
    msgId: 0,
};

// Persistent errors accumulate until dismissed; the cap bounds Redux state and the
// rendered stack when failures repeat unattended, dropping the oldest messages first.
export const MAX_STORED_ALERTS = 50;

const pushMessage = (state: State, message: string, color: MessageModel['color']) => {
    state.messages.push({
        id: state.msgId,
        time: Date.now(),
        message,
        color,
    });
    state.msgId++;

    if (state.messages.length > MAX_STORED_ALERTS) {
        state.messages.splice(0, state.messages.length - MAX_STORED_ALERTS);
    }
};

export const alertsSlice = createSlice({
    name: 'alerts',

    initialState,

    reducers: {
        error: {
            prepare: (message: string) => ({ payload: message }),

            reducer: (state, action: PayloadAction<string>) => {
                pushMessage(state, action.payload, 'danger');
            },
        },

        success: {
            prepare: (message: string) => ({ payload: message }),

            reducer: (state, action: PayloadAction<string>) => {
                pushMessage(state, action.payload, 'success');
            },
        },

        info: {
            prepare: (message: string) => ({ payload: message }),

            reducer: (state, action: PayloadAction<string>) => {
                pushMessage(state, action.payload, 'info');
            },
        },

        hide: {
            prepare: (id: number) => ({ payload: id }),

            reducer: (state, action: PayloadAction<number>) => {
                const msgIndex = state.messages.findIndex((message) => message.id === action.payload);
                if (msgIndex < 0) return;
                state.messages[msgIndex].isHiding = true;
            },
        },

        dismiss: {
            prepare: (messageId: number) => ({ payload: messageId }),

            reducer: (state, action: PayloadAction<number>) => {
                const messageIndex = state.messages.findIndex((message) => message.id === action.payload);
                if (messageIndex === -1) return;

                state.messages.splice(messageIndex, 1);
            },
        },

        dismissAll: (state) => {
            state.messages = [];
        },
    },
});
