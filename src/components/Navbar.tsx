const Navbar = () => {
    return (
        <nav className= "flex justify-between p-4 text-white border-white border-b">
            <ul>
                <li><a href="/">Home</a></li>
            </ul>
            <ul className="flex gap-4">
                <li><a href="/register">Register</a></li> 
                <li><a href="/signin">Sign In</a></li>
            </ul>
        </nav>
    );
}

export default Navbar;