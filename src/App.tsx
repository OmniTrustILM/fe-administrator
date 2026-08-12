import { Provider } from 'react-redux';
import AppRouter from './components/AppRouter';
import ThemeProvider from './components/ThemeProvider';
import configureStore from './store';

export const store = configureStore();

const App = () => {
    return (
        <Provider store={store}>
            <ThemeProvider>
                <AppRouter />
            </ThemeProvider>
        </Provider>
    );
};

export default App;
