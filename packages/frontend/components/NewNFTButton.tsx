import {
  Button,
  Box,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  VStack,
  InputGroup,
  InputLeftElement,
  Progress,
  Text,
  useToast,
} from "@chakra-ui/react";
import { AddIcon, PlusSquareIcon } from "@chakra-ui/icons";
import { hooks as metaMaskHooks } from "../connectors/metaMask";
import useNFTContract from "../hooks/useNFTContract";
import { Formik, Field, FormikErrors, FormikHelpers } from "formik";
import { FiFile } from "react-icons/fi";
import { MutableRefObject, useRef, useState } from "react";
import { create as createIPFSClient } from "ipfs-http-client";

interface Props {
  nftContractAddress: string;
}

interface FormValues {
  name: string;
  description: string;
  image?: File;
  audio?: File;
}

const ipfsClient = createIPFSClient({
  url: "https://ipfs.infura.io:5001/api/v0",
});

export default function NewNFTButton({ nftContractAddress }: Props) {
  const toast = useToast();
  const [uploadingInfo, setUploadingInfo] = useState<{
    fileName: string;
    progressValue: number;
  }>();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { useProvider } = metaMaskHooks;
  const signer = useProvider()?.getSigner();

  const imageInputRef = useRef() as MutableRefObject<HTMLInputElement>;
  const audioInputRef = useRef() as MutableRefObject<HTMLInputElement>;

  const nftContract = useNFTContract(nftContractAddress);

  const formInitialValues: FormValues = {
    name: "",
    description: "",
  };

  const handleSubmit = async (
    values: FormValues,
    actions: FormikHelpers<FormValues>
  ) => {
    if (!nftContract || !signer) return;

    try {
      const { name, description, image, audio } = values;
      const data = {
        name,
        description,
        imageURL: "",
        audioURL: "",
      };

      if (image) {
        const imageAdded = await ipfsClient.add(image, {
          progress: (prog) => {
            setUploadingInfo({
              fileName: image.name,
              progressValue: (prog / image.size) * 100,
            });
          },
        });

        const imageURL = `https://ipfs.infura.io/ipfs/${imageAdded.path}`;
        data.imageURL = imageURL;
        setUploadingInfo(undefined);
      }

      if (audio) {
        const audioAdded = await ipfsClient.add(audio, {
          progress: (prog) => {
            setUploadingInfo({
              fileName: audio.name,
              progressValue: (prog / audio.size) * 100,
            });
          },
        });

        const audioURL = `https://ipfs.infura.io/ipfs/${audioAdded.path}`;
        data.audioURL = audioURL;
        setUploadingInfo(undefined);
      }

      const dataAdded = await ipfsClient.add(JSON.stringify(data));
      const tokenURI = `https://ipfs.infura.io/ipfs/${dataAdded.path}`;

      const tx = await nftContract.connect(signer).mintToken(tokenURI);
      await tx.wait();

      toast({
        title: "Add New NFT",
        description: "Added sucessfully",
        status: "success",
        duration: 7000,
        isClosable: true,
      });
    } catch (error: any) {
      console.log(error);

      toast({
        title: "Add New NFT",
        description: error.message,
        status: "error",
        duration: 7000,
        isClosable: true,
      });
    }

    actions.resetForm();
    onClose();
  };

  return (
    <Box>
      <Button
        onClick={onOpen}
        isDisabled={!signer}
        leftIcon={<PlusSquareIcon />}
      >
        Add New NFT
      </Button>

      <Formik
        validateOnMount
        initialValues={formInitialValues}
        onSubmit={handleSubmit}
        validate={(values) => {
          const errors: FormikErrors<FormValues> = {};

          if (values.name.length === 0) {
            errors.name = "Required";
          }

          if (!values.audio) {
            errors.audio = "Required";
          }

          if (!values.image) {
            errors.image = "Required";
          }

          return errors;
        }}
      >
        {({
          handleSubmit,
          errors,
          touched,
          setFieldValue,
          values,
          isValid,
          isSubmitting,
          resetForm,
        }) => (
          <Modal
            isOpen={isOpen}
            onClose={() => {
              resetForm();
              onClose();
            }}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Add New NFT</ModalHeader>
              <ModalCloseButton />
              <form onSubmit={handleSubmit}>
                <ModalBody>
                  <VStack spacing={4} align="flex-start">
                    <FormControl
                      isInvalid={!!errors.name && touched.name}
                      isRequired
                    >
                      <FormLabel htmlFor="name">Name</FormLabel>
                      <Field as={Input} id="name" name="name" type="text" />
                      <FormErrorMessage>{errors.name}</FormErrorMessage>
                    </FormControl>

                    <FormControl>
                      <FormLabel htmlFor="description">Description</FormLabel>
                      <Field
                        as={Input}
                        id="description"
                        name="description"
                        type="text"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Image</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none">
                          <FiFile color="gray.300" />
                        </InputLeftElement>

                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files) {
                              setFieldValue("image", e.target.files[0]);
                            }
                          }}
                        />

                        <Input
                          placeholder="Your file ..."
                          onClick={() => imageInputRef.current.click()}
                          readOnly={true}
                          value={(values.image && values.image.name) || ""}
                        />
                      </InputGroup>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Audio</FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none">
                          <FiFile color="gray.300" />
                        </InputLeftElement>

                        <input
                          ref={audioInputRef}
                          type="file"
                          accept=".mp3,audio/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files) {
                              setFieldValue("audio", e.target.files[0]);
                            }
                          }}
                        />

                        <Input
                          placeholder="Your file ..."
                          onClick={() => audioInputRef.current.click()}
                          readOnly={true}
                          value={(values.audio && values.audio.name) || ""}
                        />
                      </InputGroup>
                    </FormControl>
                  </VStack>
                </ModalBody>
                <ModalFooter>
                  <Button
                    mr={3}
                    onClick={() => {
                      resetForm();
                      onClose();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    isDisabled={!isValid}
                    leftIcon={<AddIcon />}
                  >
                    Add
                  </Button>
                </ModalFooter>
              </form>

              {uploadingInfo ? (
                <Box p={2}>
                  <Text mb={1}>uploading {uploadingInfo.fileName}</Text>
                  <Progress value={uploadingInfo.progressValue} />
                </Box>
              ) : null}
            </ModalContent>
          </Modal>
        )}
      </Formik>
    </Box>
  );
}
