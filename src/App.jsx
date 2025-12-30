import Scene from './components/Scene'
import Viewfinder from './components/Viewfinder'
import useNavigation from './hooks/useNavigation'

function App() {
    // Activate keyboard/touch handlers
    useNavigation()

    return (
        <div className="app">
            <Scene />
            <Viewfinder />
        </div>
    )
}

export default App
