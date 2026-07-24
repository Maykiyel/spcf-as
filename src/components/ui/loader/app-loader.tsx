import { Center, Image } from "@mantine/core";
import logo from "@/assets/logo.png";

export function AppLoader() {
  return (
    <Center mih="100vh">
      <Image src={logo} h={80} w={80} />
    </Center>
  );
}
