const Footer = () => {
  return (
    <footer className="border-t">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} TradeSmart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 