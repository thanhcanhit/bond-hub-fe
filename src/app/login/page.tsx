"use client";

import React, { useState } from "react";
import Image from "next/image";
import QrLogin from "@/components/QrLogin";
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
import RegisterForm from "@/components/RegisterFrom";

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
    <div className="flex justify-center items-start pt-10 h-screen bg-[#e8f3ff]">
      <div className="flex flex-col items-center justify-center gap-5">
        <div className="flex flex-col items-center justify-center">
          <Image
            src="/bondhublogo.png"
            width={300}
            height={100}
            alt="Bondhub Logo"
          />
          <h2 className="text-center text-l text-gray-600">
            Đăng nhập tài khoản Bondhub để kết nối với ứng dụng Bondhub Web
          </h2>
        </div>
        <div className="bg-white shadow-lg rounded-[30px] flex flex-col items-center gap-4 relative w-[541px] h-[523px]">
          <div className="flex flex-row border-b border-gray-200 w-full h-[60px] justify-center items-center font-semibold">
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
                    className="absolute top-2 right-2 border mr-2 w-[45px] h-[35px]"
                  >
                    <AlignJustify className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuCheckboxItem
                    className="flex justify-center"
                    onSelect={() => handleSelect("password-login")}
                  >
                    Đăng nhập bằng mật khẩu
                    <Check
                      className={cn(
                        "ml-auto",
                        showLoginForm ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <div>
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
            <div className="flex flex-col gap-4 items-center">
              <a
                className="text-[#39a8f5] font-semibold cursor-pointer"
                onClick={() => handleSelect("qr-login")}
              >
                Đăng nhập bằng mã QR
              </a>
              <a
                className="text-[#39a8f5] font-semibold cursor-pointer"
                onClick={() => handleSelect("register")}
              >
                Đăng ký tài khoản
              </a>
            </div>
          ) : showRegisterForm ? (
            <a
              className="text-[#39a8f5] font-semibold cursor-pointer"
              onClick={() => handleSelect("qr-login")}
            >
              Quay lại đăng nhập
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
