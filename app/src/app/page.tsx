import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ClipboardList, Phone, CalendarDays, Search, Calendar, Utensils, MapPin, MessageSquare, Bell, BarChart3, CheckCircle, Zap, Snowflake } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold">
              <span className="text-green-800">Steak</span>
              <span className="text-amber-700">holders</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-green-700 hover:bg-green-800">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                From pasture to processor,{' '}
                <span className="text-green-700 italic">finally connected.</span>
              </h1>
              <p className="mt-6 text-xl text-gray-600">
                The platform that bridges livestock producers and meat processors.
                Streamline scheduling, cut sheets, and order tracking—all in one place.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto bg-green-700 hover:bg-green-800">
                    Get Early Access
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Sign In
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Join 50+ farmers and processors already on our platform.
              </p>
            </div>

            {/* Preview Card */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-6 border">
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                  <h3 className="font-semibold text-lg">Order #2847</h3>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                    In Progress
                  </span>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: <CheckCircle className="h-5 w-5" />, label: 'Dropped Off', detail: 'Dec 18, 2025', complete: true },
                    { icon: <CheckCircle className="h-5 w-5" />, label: 'Hanging Weight', detail: '642 lbs', complete: true },
                    { icon: <Zap className="h-5 w-5" />, label: 'Cutting', detail: 'Est. Dec 22', active: true },
                    { icon: <Snowflake className="h-5 w-5" />, label: 'Ready for Pickup', detail: "We'll notify you", pending: true },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        step.complete ? 'bg-green-700 text-white' :
                        step.active ? 'bg-amber-500 text-white animate-pulse' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {step.icon}
                      </div>
                      <div>
                        <p className="font-medium">{step.label}</p>
                        <p className="text-sm text-gray-500">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -top-4 -right-4 -z-10 w-full h-full bg-green-200/50 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-green-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-green-300 font-medium mb-4">THE PROBLEM</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-12 max-w-2xl">
            Small-scale meat processing is broken. Here&apos;s what we&apos;re fixing.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <ClipboardList className="h-8 w-8" />, title: 'Paper Cut Sheets', desc: 'Confusing forms and unclear options lead to errors and miscommunication.' },
              { icon: <Phone className="h-8 w-8" />, title: 'Phone Tag', desc: 'Want to know when your animal will be ready? Good luck reaching anyone.' },
              { icon: <CalendarDays className="h-8 w-8" />, title: 'Scheduling Chaos', desc: 'Wait times of 6+ months with no visibility into availability.' },
              { icon: <Search className="h-8 w-8" />, title: 'Zero Visibility', desc: 'Once dropped off, your animal vanishes. No tracking, no updates.' },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-6 backdrop-blur">
                <div className="mb-4 text-green-300">{item.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-green-100 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-green-700 font-medium mb-4">THE SOLUTION</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Modern tools for an age-old trade
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Calendar className="h-7 w-7 text-green-700" />, title: 'Smart Scheduling', desc: 'See real-time availability. Book slots instantly. Automatic waitlist management.' },
              { icon: <Utensils className="h-7 w-7 text-green-700" />, title: 'Visual Cut Sheets', desc: 'Interactive diagrams guide you through every cut. No more confusion.' },
              { icon: <MapPin className="h-7 w-7 text-green-700" />, title: 'Live Tracking', desc: 'Know exactly where your order is at every stage of processing.' },
              { icon: <MessageSquare className="h-7 w-7 text-green-700" />, title: 'Direct Messaging', desc: 'Skip the phone tag. Message your processor directly.' },
              { icon: <Bell className="h-7 w-7 text-green-700" />, title: 'Smart Notifications', desc: 'Get alerts for status changes, pickup ready, and slot openings.' },
              { icon: <BarChart3 className="h-7 w-7 text-green-700" />, title: 'Order History', desc: 'Every order documented. Weights, cuts, dates—all searchable.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to modernize your workflow?
          </h2>
          <p className="text-gray-600 mb-8">
            Join producers and processors already using Steakholders to streamline their operations.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-green-700 hover:bg-green-800">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-xl font-bold mb-4 md:mb-0">
              <span className="text-green-400">Steak</span>
              <span className="text-amber-400">holders</span>
            </div>
            <div className="flex gap-6 text-gray-400">
              <Link href="/login" className="hover:text-white">Sign In</Link>
              <Link href="/signup" className="hover:text-white">Sign Up</Link>
              <a href="mailto:hello@steakholders.us" className="hover:text-white">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
            © 2025 Steakholders. Built for the farmers and butchers who feed us.
          </div>
        </div>
      </footer>
    </div>
  )
}
