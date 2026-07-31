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

export const alertsSlice = createSlice({
    name: 'alerts',

    initialState,

    reducers: {
        error: {
            prepare: (message: string) => ({ payload: message }),

            reducer: (state, action: PayloadAction<string>) => {
                state.messages.push({
                    id: state.msgId,
                    time: Date.now(),
                    message: action.payload,
                    color: 'danger',
                });
                state.msgId++;
            },
        },

        success: {
            prepare: (message: string) => ({ payload: message }),

            reducer: (state, action: PayloadAction<string>) => {
                state.messages.push({
                    id: state.msgId,
                    time: Date.now(),
                    message: action.payload,
                    color: 'success',
                });
                state.msgId++;
            },
        },

        info: {
            prepare: (message: string) => ({ payload: message }),

            reducer: (state, action: PayloadAction<string>) => {
                state.messages.push({
                    id: state.msgId,
                    time: Date.now(),
                    message: action.payload,
                    color: 'info',
                });
                state.msgId++;
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
