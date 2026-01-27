const  MenuItemButtons = ({ items }: { items: string[] }) => {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          className="rounded-full border border-orange-500 px-3 py-1
                     text-sm text-orange-600 hover:bg-orange-500 hover:text-white
                     transition cursor-pointer"
          onClick={() => {
            // add-to-cart logic later
            console.log("Clicked:", item);
          }}
        >
          + {item}
        </button>
      ))}
    </div>
  );
}


export default MenuItemButtons