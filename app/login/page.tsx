import LoginForm from "@/app/ui/login-form";

export default function LoginPage() {
  return (
    <>
      <div className="mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4">
        {/* <div className="flex-center-center h-20 w-full rounded-lg p-3">
          <div className="w-full flex-center-center text-gray-400">
            <AUNLogo />
          </div>
        </div> */}
        {/* <Suspense> */}
        <LoginForm />
        {/* </Suspense> */}
        <div className="flex w-full items-center justify-between">
          <div className="text-xs text-gray-500">Don't have an account?</div>
          <div className="text-xs text-blue-500">Sign up</div>
        </div>
      </div>
    </>
  );
}
