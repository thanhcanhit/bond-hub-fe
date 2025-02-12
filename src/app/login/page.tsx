"use client";

import React, { useState } from "react";
import Image from "next/image";
import QrLogin from "@/components/QrLogin";
import LoginForm from "@/components/LoginForm";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, AlignJustify } from "lucide-react";
import { cn } from "@/lib/utils";
// import { useAuthStore } from "@/stores/authStore";
//import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [open, setOpen] = React.useState(false);
  //const router = useRouter();

  // useEffect(() => {
  //   const accessToken = localStorage.getItem("accessToken");
  //   if (accessToken) {
  //     router.push("/");
  //   }
  // }, [router]);

  const handleSelect = (currentValue: string) => {
    if (currentValue === "password-login") {
      setShowLoginForm(true);
    } else {
      setShowLoginForm(false);
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
                ? "Đăng nhập bằng mật khẩu"
                : "Đăng nhập bằng quét mã QR"}
            </p>
            {!showLoginForm ? (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 border mr-2 w-[45px] h-[35px]"
                  >
                    <AlignJustify className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0">
                  <Command>
                    <CommandList>
                      <CommandEmpty>Không tìm thấy.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          className="flex items-center cursor-pointer"
                          value="password-login"
                          onSelect={() => handleSelect("password-login")}
                        >
                          Đăng nhập bằng mật khẩu
                          <Check
                            className={cn(
                              "ml-auto",
                              showLoginForm ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
          <div>{showLoginForm ? <LoginForm /> : <QrLogin />}</div>

          {showLoginForm ? (
            <a
              className="text-[#39a8f5] font-semibold cursor-pointer"
              onClick={() => handleSelect("qr-login")}
            >
              Đăng nhập bằng mã QR
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
