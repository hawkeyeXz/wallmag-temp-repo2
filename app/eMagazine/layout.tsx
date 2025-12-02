import "@/app/eMagazine/styles.module.css";

export default function EMagazineLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full h-full p-0 m-0" style={{ padding: 0, margin: 0 }}>
            {children}
        </div>
    );
}
