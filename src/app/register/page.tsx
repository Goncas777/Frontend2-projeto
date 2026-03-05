const Register = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
            <h1 className="text-4xl font-bold mb-8">Create Your Account</h1>
            <form className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
                <div className="mb-4">
                    <label htmlFor="username" className="block text-sm font-medium mb-2">Username</label>
                    <input type="text" id="username" name="username" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring focus:ring-true-gold" />
                </div>
                <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
                    <input type="email" id="email" name="email" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring focus:ring-true-gold" />
                </div>
                <div className="mb-6">
                    <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
                    <input type="password" id="password" name="password" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring focus:ring-true-gold" />
                </div>
                <button type="submit" className="w-full py-2 bg-true-gold text-black font-bold rounded hover:bg-yellow-500 transition duration-300">Register</button>
            </form>
        </div>
    );
}

export default Register;