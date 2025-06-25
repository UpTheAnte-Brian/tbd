import { Button } from "../ui/button";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <>
      <form className="mx-auto flex justify-center bg-slate-500 border-gray-100">
        <div className="flex w-72 h-screen flex-col gap-1 ">
          <div className="text-2xl font-bold py-12">Ante Up Nation Login</div>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="h-10 rounded-lg p-2"
            placeholder="Email Address"
          />
          <input
            className="h-10 rounded-lg p-2"
            id="password"
            name="password"
            type="password"
            required
            placeholder="Password"
          />
          <div className="flex-center-center h-10">
            <Button formAction={login}>Sign In with email/password</Button>
          </div>
          {/* <button onClick={loginWithOAuth}>Sign In with Google</button> */}
        </div>
      </form>
    </>
  );
}

// import LoginForm from "@/app/ui/login-form";

// export default function LoginPage() {
//   return (
//     <>
//       <div className="mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4">
//         {/* <div className="flex-center-center h-20 w-full rounded-lg p-3">
//           <div className="w-full flex-center-center text-gray-400">
//             <AUNLogo />
//           </div>
//         </div> */}
//         {/* <Suspense> */}
//         <LoginForm />
//         {/* </Suspense> */}
//         <div className="flex w-full items-center justify-between">
//           <div className="text-xs text-gray-500">Don't have an account?</div>
//           <div className="text-xs text-blue-500">Sign up</div>
//         </div>
//       </div>
//     </>
//   );
// }
