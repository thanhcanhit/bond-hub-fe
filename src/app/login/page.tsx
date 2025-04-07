"use client";

import React, { useState } from "react";
import Image from "next/image";
import QrLogin from "@/components/QrLogin/QrLogin";

import LoginForm from "@/components/LoginForm";
import { Button } from "@/components/ui/button";
import { Check, AlignJustify } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RegisterForm from "../signup/RegisterFrom";

export default function LoginPage() {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [open, setOpen] = React.useState(false);

  const handleSelect = (currentValue: string) => {
    if (currentValue === "password-login") {
      setShowLoginForm(true);
      setShowRegisterForm(false);
    } else if (currentValue === "register") {
      setShowLoginForm(true);
      setShowRegisterForm(true);
    } else {
      setShowLoginForm(false);
      setShowRegisterForm(false);
    }
    setOpen(false);
  };

  return (
    <div className="flex justify-center items-start min-h-screen p-4 sm:p-6 md:p-10 bg-[#e8f3ff]">
      <div className="flex flex-col items-center justify-center gap-5 w-full max-w-[541px]">
        <div className="flex flex-col items-center justify-center">
          <Image
            src="/logo.png"
            width={300}
            height={100}
            alt="Vodka Logo"
            className="w-[200px] sm:w-[250px] md:w-[300px] h-auto"
          />
          <h2 className="text-center text-sm sm:text-base md:text-lg text-gray-600 whitespace-normal mt-2 max-w-[300px] mx-auto">
            Đăng nhập tài khoản Vodka để kết nối với ứng dụng Vodka Web
          </h2>
        </div>
        <div className="bg-white shadow-lg rounded-[30px] flex flex-col items-center gap-4 relative w-full h-auto min-h-[400px] sm:min-h-[523px] overflow-auto no-scrollbar">
          <div className="flex flex-row border-b border-gray-200 w-full h-[60px] justify-center items-center font-semibold text-sm sm:text-base">
            <p>
              {showLoginForm
                ? showRegisterForm
                  ? "Đăng ký tài khoản"
                  : "Đăng nhập bằng mật khẩu"
                : "Đăng nhập bằng quét mã QR"}
            </p>
            {!showLoginForm ? (
              <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 border mr-2 w-[35px] h-[35px] sm:w-[45px] sm:h-[35px]"
                  >
                    <AlignJustify className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 sm:w-56">
                  <DropdownMenuCheckboxItem
                    className="flex justify-center text-sm sm:text-base"
                    onSelect={() => handleSelect("password-login")}
                  >
                    Đăng nhập bằng mật khẩu
                    <Check
                      className={cn(
                        "ml-auto w-4 h-4",
                        showLoginForm ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <div className="w-full px-4 sm:px-6">
            {showLoginForm ? (
              showRegisterForm ? (
                <RegisterForm />
              ) : (
                <LoginForm />
              )
            ) : (
              <QrLogin />
            )}
          </div>
          {showLoginForm && !showRegisterForm ? (
            <div className="flex flex-col gap-4 items-center pb-4 text-sm sm:text-base">
              <a
                className="text-[#39a8f5] font-semibold cursor-pointer hover:underline"
                onClick={() => handleSelect("qr-login")}
              >
                Đăng nhập bằng mã QR
              </a>
              <a
                className="text-[#39a8f5] font-semibold cursor-pointer hover:underline"
                onClick={() => handleSelect("register")}
              >
                Đăng ký tài khoản
              </a>
            </div>
          ) : showRegisterForm ? (
            <div className="pb-4 text-sm sm:text-base">
              <a
                className="text-[#39a8f5] font-semibold cursor-pointer hover:underline"
                onClick={() => handleSelect("qr-login")}
              >
                Quay lại đăng nhập
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
