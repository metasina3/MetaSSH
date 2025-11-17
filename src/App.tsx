import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ServerList from './pages/ServerList';
import Terminals from './pages/Terminals';
import SFTP from './pages/SFTP';
import Settings from './pages/Settings';
import SftpPage from './pages/SftpPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ServerList />} />
        <Route path="/terminals" element={<Terminals />} />
        <Route path="/sftp" element={<SftpPage />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;

