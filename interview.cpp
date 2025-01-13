#include<iostream>
using namespace std;

class Parent{
    public:
       Parent(){
        cout<<"Its Parent's Constructor"<<endl;
       } 

       virtual void printNumber(int num){
            cout<<num<<endl; 
       }

       void printNumber(int num1,string s){
        cout<<num1<<" "<<s<<endl;
       }

       void printNumber(int num1,int num2){
            cout<<num1<<" "<<num2<<endl;
       }
};


class Child:public Parent{
    public:

        Child(){
            cout<<"Hey its's Child"<<endl;
        }
        void printNumber(int num){
            cout<<"Your are in child Class"<<endl;
            cout<<num<<endl;
        }
};

int main(){
    Parent p1;
    p1.printNumber(23);
    p1.printNumber(25,25);
    Parent *p2 = new Child();
    p2->printNumber(24);

}
