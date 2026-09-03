import { Provider } from 'react-redux';
import AppRouter from './components/AppRouter';
import ConnectedThemeProvider from './components/ThemeProvider/ConnectedThemeProvider';
import configureStore from './store';

export const store = configureStore();

const App = () => {
    return (
        <Provider store={store}>
            <ConnectedThemeProvider>
                <AppRouter />
            </ConnectedThemeProvider>
        </Provider>
    );
};

export default App;
