import Image from "next/image";

export function FounderNote() {
  return (
    <section className="founder-note reveal">
      <div className="founder-note-image">
        <Image
          src="/dan-founder-hires.png"
          alt="Dan from Pixel Card Lab"
          fill
          sizes="(max-width: 860px) 120px, 33vw"
          quality={95}
        />
      </div>
      <div className="founder-note-body">
        <p>
          As a passionate card enthusiast inspired by a magical childhood of loyalty and friendship, I am excited to
          share these cards with you. They are more than collectibles, they are little pieces of nostalgia that bring
          back memories of the friends who were by our side back then.
        </p>
        <p>
          Thank you for your support, my fellow trainers.
        </p>
        <p className="founder-signoff">Cheers, Dan</p>
      </div>
    </section>
  );
}
