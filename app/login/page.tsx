"use client";

import React, { useState } from "react";
import Image from "next/image";
import QrLogin from "@/components/QrLogin";
import LoginForm from "@/components/LoginForm";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Check, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [open, setOpen] = React.useState(false);

  const handleSelect = (currentValue:string) => {
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
          <Image src="/bondhublogo.png" width={300} height={100} alt="Bondhub Logo" />
          {/* <img src="/bondhublogo.png" style={{ width: "300px" }} alt="Bondhub Logo" /> */}
          <h2 className="text-center text-l text-gray-600">
            Đăng nhập tài khoản Bondhub để kết nối với ứng dụng Bondhub Web
          </h2>
        </div>
        <div className="p-7 bg-white shadow-lg rounded-xl flex flex-col items-center gap-4 relative w-[541px] h-[523px]">
          <p>{showLoginForm ? "Đăng nhập bằng mật khẩu" : "Đăng nhập bằng quét mã QR"}</p>
          {!showLoginForm ?
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute top-2 right-2">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandList>
                  <CommandEmpty>Không tìm thấy.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="password-login"
                      onSelect={() => handleSelect("password-login")}
                    >
                      Đăng nhập bằng mật khẩu
                      <Check
                        className={cn(
                          "ml-auto",
                          showLoginForm ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover> : null
          }
          {showLoginForm ? <LoginForm /> : <QrLogin />}
          {showLoginForm ?
          <a className="text-[#39a8f5] font-semibold cursor-pointer" onClick={() => handleSelect('qr-login')}>Đăng nhập bằng mã QR</a>
            : null}
          </div>
      </div>
    </div>
  );
  // return (
  //   <>
  //     <div className="flex justify-center items-start pt-10 h-screen bg-[#e8f3ff]">
  //       {/* {isLoading ? (
  //       <p className="text-xl font-semibold">Đang xử lý...</p>
  //     ) : ( */}
  //       <div className="flex flex-col items-center justify-center gap-5">
  //         <div className="flex flex-col items-center justify-center">
  //           <img
  //             src="/bondhublogo.png"
  //             style={{ width: "300px"}}
  //           ></img>
  //           <h2 className="text-center text-l text-gray-600">
  //             Đăng nhập tài khoản Bondhub <p></p> để kết nối với ứng dụng Bondhub
  //             Web
  //           </h2>
  //         </div>
  //         <div className="p-7 bg-white shadow-lg rounded-xl flex flex-row justify-between gap-10">
  //           <div>
  //             <p>Đăng nhập bằng quét mã QR</p>
  //             <button></button>
  //           </div>
  //           <QrLogin />
  //           <LoginForm />
  //         </div>
  //       </div>
  //       {/* )} */}
  //     </div>
  //   </>
    
  // );
}
