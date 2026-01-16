const AuthFooter = () => {
    return (
        <footer className="absolute bottom-0 left-0 right-0 py-4 text-center text-gray-500 text-sm">
            <div className="flex items-center justify-center gap-4">
                <a href="/terms" className="hover:text-brand hover:underline">Terms of Service</a>
                <span>|</span>
                <a href="/privacy" className="hover:text-brand hover:underline">Privacy Policy</a>
                <span>|</span>
                <a href="/help" className="hover:text-brand hover:underline">Help</a>
            </div>
            <p className="mt-2">&copy; {new Date().getFullYear()} Udemy. All rights reserved.</p>
        </footer>
    );
};

export default AuthFooter;
