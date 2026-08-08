import { Routes, Route } from "react-router-dom";
import { ItemsProvider } from "./hooks/ItemsContext";
import { AuthProvider } from "./hooks/AuthContext";
import Navbar from "./components/Navbar";
import LoginModal from "./components/LoginModal";
import Home from "./pages/Home";
import PostItem from "./pages/PostItem";
import ItemDetails from "./pages/ItemDetails";

export default function App() {
  return (
    <AuthProvider>
      <ItemsProvider>
        <div className="app">
          <Navbar />

          <main className="app__main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/post/:type" element={<PostItem />} />
              <Route path="/item/:id" element={<ItemDetails />} />
            </Routes>
          </main>

          <footer className="app__footer">
            <div className="app__footer-inner">
              <div>
                <strong>The Board</strong>
                <span>KIIT campus lost &amp; found</span>
              </div>
              <p>
                Meet in a public campus location and confirm ownership before
                handing an item over.
              </p>
            </div>
          </footer>
        </div>

        <LoginModal />
      </ItemsProvider>
    </AuthProvider>
  );
}
