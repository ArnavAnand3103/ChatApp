import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';

import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ChatPage from './pages/ChatPage.jsx';
import Home from './pages/Home.jsx';
import {useAuth} from './context/AuthContext';
import StarredMessages from './pages/StarredMessages.jsx';

export default function App(){
    const {token}=useAuth();
    const isAuthenticated=Boolean(token);

    return(
        <BrowserRouter>
        <Routes>
        <Route path='/'
        element={<Home/>}/>
        <Route path="/login"
        element={<Login/>}/>
        <Route
        path="/signup"
        element={<Signup/>}/>
        <Route path="/chat"
        element={
            isAuthenticated
            ?<ChatPage/>
            :<Navigate to='/login'/>
        }
        />
   
        <Route
        path="/starred"
        element={
            isAuthenticated
            ?<StarredMessages/>
            :<Navigate to="/login"/>
        }
        />
        </Routes>
        </BrowserRouter>
    )
}