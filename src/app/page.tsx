import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="w-full py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="text-2xl font-bold">Vodka</div>
        <div className="flex space-x-4">
          <Link href="/login">
            <span className="text-black hover:text-gray-700 cursor-pointer">
              Đăng nhập
            </span>
          </Link>
          <Link href="/register">
            <span className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors cursor-pointer">
              Đăng ký
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center px-6 md:px-12 py-8 max-w-7xl mx-auto w-full">
        {/* Left Side - Text Content */}
        <div className="w-full md:w-1/2 mb-10 md:mb-0 md:pr-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Trò chuyện với
            <br />
            bạn bè của bạn
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            Kết nối và trò chuyện với bạn bè của bạn thông qua nền tảng của
            chúng tôi.
          </p>
          <Link href="/login">
            <span className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors cursor-pointer text-lg">
              Đăng nhập
            </span>
          </Link>
        </div>

        {/* Right Side - Chat Illustration */}
        <div className="w-full md:w-1/2 flex justify-center">
          <div className="relative w-full max-w-md">
            <div className="bg-[#7c5cfc] rounded-3xl p-4 shadow-lg">
              <div className="bg-white rounded-2xl p-4">
                {/* Chat Header */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                </div>

                {/* Chat Messages */}
                <div className="space-y-4">
                  {/* Incoming Message */}
                  <div className="flex items-start">
                    <div className="bg-[#f0f0f0] rounded-2xl p-3 max-w-[80%]">
                      <div className="h-2 w-32 bg-gray-300 rounded mb-2"></div>
                      <div className="h-2 w-40 bg-gray-300 rounded"></div>
                    </div>
                  </div>

                  {/* Outgoing Message */}
                  <div className="flex items-start justify-end">
                    <div className="bg-[#7c5cfc] rounded-2xl p-3 max-w-[80%]">
                      <div className="h-2 w-36 bg-white/50 rounded mb-2"></div>
                      <div className="h-2 w-28 bg-white/50 rounded"></div>
                    </div>
                  </div>

                  {/* Incoming Message */}
                  <div className="flex items-start">
                    <div className="bg-[#f0f0f0] rounded-2xl p-3 max-w-[80%]">
                      <div className="h-2 w-24 bg-gray-300 rounded mb-2"></div>
                      <div className="h-2 w-36 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="mt-4 flex items-center">
                  <div className="flex-1 h-8 bg-gray-100 rounded-full"></div>
                  <div className="ml-2 w-8 h-8 rounded-full bg-[#7c5cfc] flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
