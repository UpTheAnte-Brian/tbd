// import GoogleSignInButton from "../components/ui/GoogleSignInButton";
import { signup, signInWithOtp, loginWithOAuth } from "../login/actions";

export default function SignupPage() {
  return (
    <div className="mx-auto ">
      <form className="flex-center-center py-8 ">
        <div className="flex p-6 flex-col justify-center border rounded-lg border-gray-700">
          <button onClick={loginWithOAuth}>Sign Up with Google</button>
          {/* <GoogleSignInButton></GoogleSignInButton> */}
          <hr></hr>
          <p className="flex justify-center items-center py-8">
            Or use an email and password
          </p>
          <label htmlFor="email">Email:</label>
          <input id="email" name="email" type="email" required />
          {/* <label htmlFor="password">Password:</label>
          <input id="password" name="password" type="password" required /> */}
          <button formAction={signInWithOtp}>Log in</button>
          <button formAction={signup}>Sign up</button>
        </div>
      </form>
    </div>
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
