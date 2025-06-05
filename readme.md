# TradeSmart 🚀 - AI-Powered Stock Brokerage Calculator

> **Built entirely with AI** using Cursor IDE, Claude, and other cutting-edge AI tools. A testament to the power of AI-assisted development in 2025.

Stop losing money to hidden charges! TradeSmart instantly calculates **every single fee** for your Indian stock trades, so you know your exact profit/loss before you click buy/sell.

## ✨ Why TradeSmart?

**🎯 Zero Surprises** - See your exact net P&L including all 8+ types of charges  
**⚡ Lightning Fast** - Real-time calculations as you type  
**🔐 Secure & Modern** - Supabase authentication with JWT tokens  
**📱 Mobile First** - Beautiful UI that works everywhere  
**🤖 AI-Crafted** - Entirely built using AI tools and modern best practices  

## 🛠️ Tech Stack (All AI-Assembled)

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS  
**Backend:** Django 5 + Python + REST API  
**Database:** PostgreSQL + Supabase  
**Auth:** Supabase Auth with JWT integration  
**UI:** shadcn/ui components + Lucide icons  
**Deployment:** Vercel (Frontend) + Render (Backend)  

## 🎯 Features

### 💰 Smart Calculations
- **All statutory charges included**: STT, Exchange fees, SEBI charges, GST, Stamp duty, IPFT
- **Multi-broker support**: Groww (delivery), Dhan (delivery + intraday)  
- **Bulk transactions**: Add multiple buy/sell orders for the same stock
- **Real-time P&L**: Watch your profit/loss update instantly

### 🔐 User Experience  
- **Save & track transactions** (with authentication)
- **Dark/Light mode** toggle
- **Mobile-responsive** design
- **Error handling** with helpful messages
- **Search & filter** saved transactions

### 🤖 AI Development Story
This entire application was built using:
- **Cursor IDE** for AI-powered coding
- **Claude Sonnet** for architecture decisions
- **Lovable.dev** for rapid prototyping  
- **AI-generated components** throughout the codebase
- **Modern development patterns** suggested by AI tools

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/tradesmart-stockcalc.git
   cd tradesmart-stockcalc
   ```

2. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   # On Windows: venv\Scripts\activate
   # On Mac/Linux: source venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```

3. **Frontend setup:**
   ```bash
   cd ../frontend
   npm install
   # Create .env.development with VITE_API_URL=http://localhost:8000
   npm run dev
   ```

4. **Open your browser:**
   - Go to `http://localhost:5173`
   - Start calculating! 🎉

## 🎮 Live Demo

Try it out: [TradeSmart Calculator](https://your-deployed-url.com)

## 🔮 Roadmap

- **More brokers**: Zerod‌ha, Upstox, Angel One
- **F&O calculations**: Futures & Options support  
- **Advanced analytics**: Charts, trends, profit tracking
- **Portfolio integration**: Import trades from brokers
- **Tax optimization**: Capital gains calculations

## 🤝 Contributing

This project welcomes contributions! Whether you're fixing bugs, adding features, or improving AI-generated code, your help is appreciated.

## 📄 License

MIT License - Feel free to use this AI-crafted code for your own projects!

---

**Built with ❤️ and 🤖 AI in 2025**  
*Demonstrating how AI tools can create production-ready applications*