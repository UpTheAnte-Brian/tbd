export default function Page() {
  // const blurredBackground =
  //   "bg-gradient-to-b from-blue-500 to-blue-700 blur-sm";
  const focusedBackground = `items-center  justify-center relative size-32 rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 hover:shadow-lg`;
  const goldBackground =
    "absolute bg-gradient-to-b from-yellow-200 to-yellow-300";

  return (
    <>
      <div className="flex-row p-4 bg-green-600">
        <div className="grid grid-cols-3 grid-flow-row gap-4">
          {/* <!-- Pin to top left corner --> */}
          <div className={focusedBackground}>
            <div className={`size-16 ${goldBackground}`}>01</div>
          </div>
          {/* <!-- Span top edge --> */}
          <div className={focusedBackground}>
            <div className={`inset-x-0 top-0 h-16 ${goldBackground}`}>02</div>
          </div>
          {/* <!-- Pin to top right corner --> */}
          <div className={focusedBackground}>
            <div className={`top-0 right-0 size-16 ${goldBackground}`}>03</div>
          </div>
          {/* <!-- Span left edge --> */}
          <div className={focusedBackground}>
            <div className={`inset-y-0 left-0 w-16 ${goldBackground}`}>04</div>
          </div>
          {/* <!-- Fill entire parent --> */}
          <div className={focusedBackground}>
            <div className={`inset-0 ${goldBackground}`}>05</div>
          </div>
          {/* <!-- Span right edge --> */}
          <div className={focusedBackground}>
            <div className={`inset-y-0 right-0 w-16 ${goldBackground}`}>06</div>
          </div>
          {/* <!-- Pin to bottom left corner --> */}
          <div className={focusedBackground}>
            <div className={`bottom-0 left-0 size-16 ${goldBackground}`}>
              07
            </div>
          </div>
          {/* <!-- Span bottom edge --> */}
          <div className={focusedBackground}>
            <div className={`inset-x-0 bottom-0 h-16 ${goldBackground}`}>
              08
            </div>
          </div>
          {/* <!-- Pin to bottom right corner --> */}
          <div className={focusedBackground}>
            <div className={`right-0 bottom-0 size-16 ${goldBackground}`}>
              09
            </div>
          </div>
        </div>
      </div>
      {/* <div
  className="relative w-0 h-0 border-l-[15px] border-r-[15px] border-b-[26px] border-l-transparent border-r-transparent border-b-black"
/> */}
    </>
  );
}
