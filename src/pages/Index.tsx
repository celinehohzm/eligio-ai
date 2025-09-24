
import { ArrowRight, Calendar, FileText, Brain, Users, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Eligio AI</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Features
            </a>
            <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              Testimonials
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-20 lg:py-32">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Revolutionize Your
              <span className="text-blue-600 block">Patient Workflow</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              AI-powered medical note summarization & intelligent scheduling recommendations 
              that help doctors focus on what matters most - patient care.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/chat">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg"
                >
                  Try it out!
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-20 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Healthcare
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI-driven platform streamlines your workflow and enhances patient care.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-blue-600">
              <CardContent className="p-0">
                <FileText className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Smart Note Summarization
                </h3>
                <p className="text-gray-600">
                  Automatically extract key insights from patient notes using advanced AI, 
                  saving hours of manual review time.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-blue-600">
              <CardContent className="p-0">
                <Calendar className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Intelligent Scheduling
                </h3>
                <p className="text-gray-600">
                  Get personalized scheduling recommendations based on patient history, 
                  urgency levels, and optimal care windows.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-blue-600">
              <CardContent className="p-0">
                <Brain className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  AI-Powered Insights
                </h3>
                <p className="text-gray-600">
                  Discover patterns in patient data and receive actionable insights 
                  to improve treatment outcomes.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-blue-600">
              <CardContent className="p-0">
                <Users className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Team Collaboration
                </h3>
                <p className="text-gray-600">
                  Seamlessly share insights and coordinate care with your medical team 
                  in real-time.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-blue-600">
              <CardContent className="p-0">
                <Shield className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  HIPAA Compliant
                </h3>
                <p className="text-gray-600">
                  Enterprise-grade security ensures all patient data is protected 
                  with full HIPAA compliance.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-blue-600">
              <CardContent className="p-0">
                <Zap className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Lightning Fast
                </h3>
                <p className="text-gray-600">
                  Process thousands of medical notes in seconds, not hours. 
                  Get instant results when you need them most.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="px-4 py-20 bg-blue-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Healthcare Professionals
            </h2>
            <p className="text-xl text-gray-600">
              See how Eligio AI will transform medical practices nationwide.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 bg-white">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    KG
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900">Neurologist</h4>
                    <p className="text-gray-600 text-sm">Johns Hopkins Hospital</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "Having Eligio AI would cut my note review time by 70%. I would be able to spend more quality time 
                  with my patients instead of drowning in paperwork."
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 bg-white">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    JB
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900">Cardiologist</h4>
                    <p className="text-gray-600 text-sm">Mount Sinai Hospital</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "Eligio AI would be a game-changer for our practice. The AI insights would help us identify patient 
                  needs we might have missed. Absolutely revolutionary."
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 bg-white">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    RP
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900">Patient Access Leadership Team</h4>
                    <p className="text-gray-600 text-sm">Johns Hopkins Hospital</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "60% of referrals require manual chart review, and it takes 40 hours/week to review documentation. Eligio AI would really help us reduce scheduling time and streamline referrals."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 bg-blue-600">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join the waitlist to be among the first healthcare professionals to experience 
            the future of AI-powered medical practice management with Eligio AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/chat">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-blue-600 hover:bg-white hover:text-blue-600 px-8 py-3 text-lg"
              >
                Eligio AI chat
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 bg-gray-900 text-white">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-1 gap-8 text-center">
            <div>
              <div className="flex items-center space-x-2 mb-4 justify-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Eligio AI</span>
              </div>
              <p className="text-gray-400">
                Revolutionizing healthcare with AI-powered solutions for medical professionals.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Eligio AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
