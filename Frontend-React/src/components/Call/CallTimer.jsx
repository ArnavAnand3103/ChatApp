import { useEffect, useState } from "react";

export default function CallTimer({

    startedAt

}) {

    const [seconds, setSeconds] = useState(0);

    useEffect(() => {

        if (!startedAt) return;

        const timer = setInterval(() => {

            setSeconds(

                Math.floor(

                    (Date.now() - startedAt) / 1000

                )

            );

        }, 1000);

        return () => clearInterval(timer);

    }, [startedAt]);

    const mins = Math.floor(seconds / 60);

    const secs = seconds % 60;

    return (

        <div>

            {mins}:

            {secs.toString().padStart(2,"0")}

        </div>

    );

}